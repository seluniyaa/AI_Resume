from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import JobListing, User, Resume
from app.schemas.schemas import JobSearchQuery, JobAction
from app.routers.auth import get_current_user_from_token
from app.services.job_search_service import search_online_jobs

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])

def job_to_dict(j: JobListing) -> dict:
    return {
        "id": j.id,
        "job_id_str": j.job_id_str,
        "title": j.title,
        "company": j.company,
        "location": j.location,
        "description": j.description,
        "url": j.url,
        "contact_email": j.contact_email,
        "match_score": j.match_score,
        "status": j.status
    }

@router.post("/search")
def search_jobs(
    query: JobSearchQuery,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    # Clear previous job listings for this user to keep UI, PDF, and Sheets 100% in sync
    db.query(JobListing).filter(JobListing.user_id == user.id).delete()
    db.commit()

    keywords = query.keywords if query.keywords else ["Data Analyst", "Python", "SQL"]
    raw_jobs = search_online_jobs(
        keywords=keywords,
        target_role=query.target_role or "Data Analyst",
        location=query.location or "",
        work_mode=query.work_mode or "All",
        experience_level=query.experience_level or "All",
        sort_by=query.sort_by or "match_score"
    )

    db_jobs = []
    for job in raw_jobs:
        new_job = JobListing(
            user_id=user.id,
            job_id_str=job["job_id_str"],
            title=job["title"],
            company=job["company"],
            location=job["location"],
            description=job["description"],
            url=job["url"],
            contact_email=job["contact_email"],
            match_score=job["match_score"],
            status="listed"
        )
        db.add(new_job)
        db.commit()
        db.refresh(new_job)
        db_jobs.append(job_to_dict(new_job))

    return {"jobs": db_jobs}

@router.get("/list")
def list_user_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user_from_token)):
    jobs = db.query(JobListing).filter(
        JobListing.user_id == user.id,
        JobListing.status != "removed"
    ).order_by(JobListing.match_score.desc()).all()
    return {"jobs": [job_to_dict(j) for j in jobs]}

@router.post("/action")
def job_action(
    action: JobAction,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user_from_token)
):
    valid_statuses = ["listed", "saved", "removed", "applied"]
    if action.status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status action")

    jobs = db.query(JobListing).filter(
        JobListing.id.in_(action.job_ids),
        JobListing.user_id == user.id
    ).all()

    for j in jobs:
        j.status = action.status
    db.commit()

    return {"message": f"Updated {len(jobs)} jobs to status '{action.status}'"}
