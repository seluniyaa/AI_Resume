from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import JobListing, User, Resume
from app.schemas.schemas import ExportSheetsRequest
from app.routers.auth import get_current_user_from_token
from app.services.gsheets_service import generate_google_sheets_export_payload, DEFAULT_SPREADSHEET_ID

router = APIRouter(prefix="/api/actions", tags=["Actions"])

@router.post("/export-sheets")
def export_to_google_sheets(
    req: ExportSheetsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    target_jobs = []
    if req.job_ids:
        target_jobs = db.query(JobListing).filter(
            JobListing.id.in_(req.job_ids),
            JobListing.user_id == user.id
        ).all()

    if not target_jobs:
        target_jobs = db.query(JobListing).filter(
            JobListing.user_id == user.id,
            JobListing.status.in_(["saved", "applied"])
        ).all()

    if not target_jobs:
        target_jobs = db.query(JobListing).filter(
            JobListing.user_id == user.id,
            JobListing.status != "removed"
        ).order_by(JobListing.match_score.desc()).all()

    # Update exported jobs to 'saved' status in DB so PDF report and state remain 100% aligned
    for j in target_jobs:
        if j.status == "listed":
            j.status = "saved"
    db.commit()

    latest_resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    candidate_profile = latest_resume.parsed_json if latest_resume and latest_resume.parsed_json else {
        "full_name": user.full_name,
        "email": user.email
    }

    job_dicts = []
    for j in target_jobs:
        job_dicts.append({
            "title": j.title,
            "company": j.company,
            "location": j.location,
            "match_score": j.match_score,
            "contact_email": j.contact_email,
            "url": j.url
        })

    sheet_id = req.spreadsheet_id if req.spreadsheet_id else DEFAULT_SPREADSHEET_ID
    payload = generate_google_sheets_export_payload(candidate_profile, job_dicts, sheet_id=sheet_id)
    return payload

@router.post("/auto-apply")
def legal_auto_apply(
    req: ExportSheetsRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    target_jobs = db.query(JobListing).filter(
        JobListing.id.in_(req.job_ids),
        JobListing.user_id == user.id
    ).all()

    latest_resume = db.query(Resume).filter(Resume.user_id == user.id).order_by(Resume.id.desc()).first()
    candidate_profile = latest_resume.parsed_json if latest_resume and latest_resume.parsed_json else {
        "full_name": user.full_name,
        "email": user.email
    }

    applications = []
    for job in target_jobs:
        job.status = "applied"
        cover_letter = (
            f"Dear Hiring Team at {job.company},\n\n"
            f"I am writing to express my strong interest in the {job.title} role. "
            f"With expertise in {', '.join(candidate_profile.get('skills', ['software development'])[:3])}, "
            f"I am confident in contributing effectively to your team.\n\n"
            f"Best regards,\n{candidate_profile.get('full_name', user.full_name)}\n"
            f"Email: {candidate_profile.get('email', user.email)}"
        )
        
        applications.append({
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "url": job.url,
            "contact_email": job.contact_email,
            "cover_letter_preview": cover_letter,
            "status": "Ready for 1-Click Application"
        })

    db.commit()

    return {
        "message": f"Prepared {len(applications)} legal auto-application packages.",
        "applications": applications
    }
