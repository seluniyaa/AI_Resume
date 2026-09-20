import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app.routers import auth, resume, jobs, actions
from app.config import UPLOAD_DIR

# Create SQLite database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Resume & Job Pipeline API",
    description="Master Level AI Resume System with Ollama qwen2.5:3b ATS scoring, multi-format OCR, live job search, Google Sheets export, and legal auto-apply.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(resume.router)
app.include_router(jobs.router)
app.include_router(actions.router)

# Mount upload directory
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.get("/")
def read_root():
    return {
        "status": "online",
        "system": "AI Resume & Job Pipeline API",
        "ai_engine": "Ollama qwen2.5:3b",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
