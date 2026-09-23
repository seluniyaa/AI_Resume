from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any, Dict

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: Dict[str, Any]

class ResumeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    target_role: Optional[str] = None
    skills: Optional[List[str]] = []
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    summary: Optional[str] = None

class JobSearchQuery(BaseModel):
    keywords: List[str]
    target_role: Optional[str] = "Software Engineer"
    location: Optional[str] = ""
    work_mode: Optional[str] = "All" # All, Remote, Hybrid, On-Site
    experience_level: Optional[str] = "All" # All, Entry, Mid, Senior, Executive
    sort_by: Optional[str] = "match_score" # match_score, recency

class JobAction(BaseModel):
    job_ids: List[int]
    status: str # saved, removed, applied

class ExportSheetsRequest(BaseModel):
    job_ids: Optional[List[Any]] = []
    jobs: Optional[List[Dict[str, Any]]] = []
    spreadsheet_id: Optional[str] = "13YrBaEiTJZ7LP-ROpFfLzhp2MCPQtBBU5w6PgXdJ7rY"
    webhook_url: Optional[str] = ""
