import os
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import UPLOAD_DIR, MAX_FILE_SIZE_BYTES
from app.models.models import Resume, User, JobListing
from app.schemas.schemas import ResumeUpdate
from app.routers.auth import get_current_user_from_token
from app.services.ocr_service import extract_text_from_file
from app.services.ai_service import parse_and_analyze_resume
from app.services.job_search_service import search_online_jobs
from app.services.report_service import generate_consolidated_report_json, generate_consolidated_report_pdf

router = APIRouter(prefix="/api/resume", tags=["Resume"])

def sanitize_and_upgrade_resume_analysis(resume: Resume, db: Session) -> dict:
    ai_result = resume.ai_analysis or {}
    rewrites_str = str(ai_result.get("improvements", {}).get("bullet_rewrites", []))
    
    # Force re-analysis if database record has legacy hallucinated metrics ("10%", "25%") or duplicated verbs ("Spearheaded")
    if "10%" in rewrites_str or "25%" in rewrites_str or "Spearheaded" in rewrites_str or not ai_result.get("scores"):
        ai_result = parse_and_analyze_resume(resume.raw_text)
        scores = ai_result.get("scores", {})
        resume.ats_score = scores.get("overall_match", 80)
        resume.parsed_json = ai_result.get("parsed_profile", resume.parsed_json)
        resume.ai_analysis = ai_result
        db.commit()
        db.refresh(resume)
        
    return ai_result

def get_report_job_listings(user_id: int, parsed_profile: dict, db: Session) -> list:
    # 1. Prioritize explicitly saved/ticked jobs by the user
    ticked_jobs = db.query(JobListing).filter(
        JobListing.user_id == user_id,
        JobListing.status.in_(["saved", "applied"])
    ).order_by(JobListing.match_score.desc()).all()

    if ticked_jobs:
        return [{"title": j.title, "company": j.company, "location": j.location, "match_score": j.match_score, "contact_email": j.contact_email, "url": j.url} for j in ticked_jobs]

    # 2. Otherwise fallback to listed jobs in user's active search result session
    db_jobs = db.query(JobListing).filter(
        JobListing.user_id == user_id,
        JobListing.status != "removed"
    ).order_by(JobListing.match_score.desc()).all()

    if db_jobs:
        return [{"title": j.title, "company": j.company, "location": j.location, "match_score": j.match_score, "contact_email": j.contact_email, "url": j.url} for j in db_jobs[:10]]

    target_role = (parsed_profile or {}).get("target_role", "Data Analyst")
    skills = (parsed_profile or {}).get("skills", [])
    location = (parsed_profile or {}).get("location", "")
    live_jobs = search_online_jobs(keywords=skills, target_role=target_role, location=location)
    return [{"title": j["title"], "company": j["company"], "location": j["location"], "match_score": j["match_score"], "contact_email": j["contact_email"], "url": j["url"]} for j in live_jobs[:10]]

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    allowed_exts = [".pdf", ".docx", ".txt", ".jpg", ".jpeg", ".png"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail=f"Unsupported file format {ext}. Allowed: PDF, DOCX, TXT, JPG, PNG")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE_BYTES:
        max_mb = MAX_FILE_SIZE_BYTES / (1024 * 1024)
        raise HTTPException(
            status_code=400, 
            detail=f"File size ({file_size / (1024 * 1024):.1f} MB) exceeds the {max_mb:.0f} MB limit. Please upload a file under {max_mb:.0f} MB."
        )

    file_path = os.path.join(UPLOAD_DIR, f"user_{user.id}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    raw_text, file_type = extract_text_from_file(file_path, file.filename)
    ai_result = parse_and_analyze_resume(raw_text)

    parsed_profile = ai_result.get("parsed_profile", {})
    if not parsed_profile.get("full_name") or parsed_profile.get("full_name") == "Candidate":
        parsed_profile["full_name"] = user.full_name or user.email.split("@")[0]
    if not parsed_profile.get("email") or parsed_profile.get("email") == "N/A":
        parsed_profile["email"] = user.email

    scores = ai_result.get("scores", {})
    ats_score = scores.get("overall_match", ai_result.get("ats_score", 80))

    db_resume = Resume(
        user_id=user.id,
        filename=file.filename,
        file_type=file_type,
        raw_text=raw_text,
        parsed_json=parsed_profile,
        ats_score=ats_score,
        ai_analysis=ai_result
    )
    db.add(db_resume)
    db.commit()
    db.refresh(db_resume)

    return {
        "message": "Resume processed successfully",
        "resume_id": db_resume.id,
        "filename": db_resume.filename,
        "file_type": db_resume.file_type,
        "ats_score": db_resume.ats_score,
        "scores": scores,
        "parsed_profile": db_resume.parsed_json,
        "section_corrections": ai_result.get("section_corrections", []),
        "ai_improvements": ai_result.get("improvements", {}),
        "truthfulness_labels": ai_result.get("truthfulness_labels", [])
    }

@router.get("/latest")
def get_latest_resume(db: Session = Depends(get_db), user: User = Depends(get_current_user_from_token)):
    resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    if not resume:
        return {"resume": None}

    ai_result = sanitize_and_upgrade_resume_analysis(resume, db)
    scores = ai_result.get("scores", {})
    return {
        "resume_id": resume.id,
        "filename": resume.filename,
        "raw_text": resume.raw_text,
        "parsed_profile": resume.parsed_json,
        "ats_score": resume.ats_score,
        "scores": scores,
        "section_corrections": ai_result.get("section_corrections", []),
        "ai_improvements": ai_result.get("improvements", {}),
        "truthfulness_labels": ai_result.get("truthfulness_labels", [])
    }

@router.put("/update/{resume_id}")
def update_resume_profile(
    resume_id: int,
    data: ResumeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    current_profile = dict(resume.parsed_json or {})
    
    if data.full_name is not None: current_profile["full_name"] = data.full_name
    if data.email is not None: current_profile["email"] = data.email
    if data.phone is not None: current_profile["phone"] = data.phone
    if data.target_role is not None: current_profile["target_role"] = data.target_role
    if data.skills is not None: current_profile["skills"] = data.skills
    if data.summary is not None: current_profile["summary"] = data.summary
    if data.experience is not None: current_profile["experience"] = data.experience
    if data.education is not None: current_profile["education"] = data.education

    resume.parsed_json = current_profile
    db.commit()
    db.refresh(resume)

    return {
        "message": "Resume profile updated successfully",
        "parsed_profile": resume.parsed_json
    }

@router.get("/report/json")
def get_consolidated_report_json(db: Session = Depends(get_db), user: User = Depends(get_current_user_from_token)):
    resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet for this user")

    ai_result = sanitize_and_upgrade_resume_analysis(resume, db)
    job_dicts = get_report_job_listings(user.id, resume.parsed_json or {}, db)
    
    report = generate_consolidated_report_json(
        candidate_profile=resume.parsed_json or {},
        ats_score=resume.ats_score,
        ai_improvements=ai_result.get("improvements", {}),
        matched_jobs=job_dicts,
        scores=ai_result.get("scores", {}),
        truthfulness_labels=ai_result.get("truthfulness_labels", []),
        section_corrections=ai_result.get("section_corrections", [])
    )
    return report

@router.get("/report/pdf")
def get_consolidated_report_pdf(db: Session = Depends(get_db), user: User = Depends(get_current_user_from_token)):
    resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    if not resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet for this user")

    ai_result = sanitize_and_upgrade_resume_analysis(resume, db)
    job_dicts = get_report_job_listings(user.id, resume.parsed_json or {}, db)

    report_data = generate_consolidated_report_json(
        candidate_profile=resume.parsed_json or {},
        ats_score=resume.ats_score,
        ai_improvements=ai_result.get("improvements", {}),
        matched_jobs=job_dicts,
        scores=ai_result.get("scores", {}),
        truthfulness_labels=ai_result.get("truthfulness_labels", []),
        section_corrections=ai_result.get("section_corrections", [])
    )

    pdf_bytes = generate_consolidated_report_pdf(report_data)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Consolidated_AI_Resume_Report.pdf"}
    )

@router.delete("/clear")
def clear_user_resume_and_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user_from_token)):
    db.query(JobListing).filter(JobListing.user_id == user.id).delete()
    db.query(Resume).filter(Resume.user_id == user.id).delete()
    db.commit()
    return {"message": "All pipeline data cleared successfully"}
