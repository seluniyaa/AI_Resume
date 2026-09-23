from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import JobListing, User, Resume
from app.schemas.schemas import ExportSheetsRequest
from app.routers.auth import get_current_user_from_token

router = APIRouter(prefix="/api/actions", tags=["Actions"])

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
