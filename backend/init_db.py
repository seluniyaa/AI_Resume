"""
Database Migration & Seeding Initialization Script
===================================================
Initializes SQLite database schema, creates tables, creates required
directories, and seeds default demonstration accounts.
"""

import os
import sys
import hmac
import hashlib
from sqlalchemy import inspect

# Ensure backend root is in sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import engine, SessionLocal, Base
from app.models.models import User, Resume, JobListing
from app.config import SECRET_KEY, UPLOAD_DIR

def hash_password(password: str) -> str:
    return hmac.new(SECRET_KEY.encode(), password.encode(), hashlib.sha256).hexdigest()

def init_database():
    print("=" * 70)
    print("  AI RESUME & JOB PIPELINE - DATABASE INITIALIZATION")
    print("=" * 70)
    
    # 1. Ensure storage directories exist
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    print(f"[*] Verified upload directory: {UPLOAD_DIR}")
    
    # 2. Create tables
    print("[*] Creating / migrating database schema tables...")
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"[OK] Database tables verified ({len(tables)} tables): {', '.join(tables)}")
    
    # 3. Seed demonstration users
    db = SessionLocal()
    try:
        demo_accounts = [
            {
                "email": "candidate@resumemaster.ai",
                "password": "candidate123",
                "full_name": "Alexander Wright (Sample Candidate)"
            },
            {
                "email": "recruiter@resumemaster.ai",
                "password": "recruiter123",
                "full_name": "Master Recruiter (Talent Partner)"
            }
        ]
        
        created_count = 0
        for acc in demo_accounts:
            existing = db.query(User).filter(User.email == acc["email"]).first()
            if not existing:
                new_user = User(
                    email=acc["email"],
                    hashed_password=hash_password(acc["password"]),
                    full_name=acc["full_name"]
                )
                db.add(new_user)
                created_count += 1
                print(f"[*] Seeded demo user: {acc['email']} / {acc['password']}")
            else:
                print(f"[INFO] Existing user verified: {acc['email']}")
                
        db.commit()
        total_users = db.query(User).count()
        total_resumes = db.query(Resume).count()
        total_jobs = db.query(JobListing).count()
        
        print(f"[OK] Database state: {total_users} Users, {total_resumes} Resumes, {total_jobs} Job Listings.")
        print("[OK] Database migration and initialization completed successfully.")
        print("=" * 70)
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Database initialization failed: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    init_database()
