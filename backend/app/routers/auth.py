import hashlib
import hmac
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
from sqlalchemy.orm import Session
import jwt
from datetime import datetime, timedelta

from app.database import get_db
from app.models.models import User
from app.schemas.schemas import UserCreate, UserLogin, Token
from app.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter(prefix="/api/auth", tags=["Auth"])

def hash_password(password: str) -> str:
    return hmac.new(SECRET_KEY.encode(), password.encode(), hashlib.sha256).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    expected_hash = hash_password(plain_password)
    return hmac.compare_digest(expected_hash, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user_from_token(
    authorization: str = Header(None), 
    token: str = Query(None), 
    db: Session = Depends(get_db)
) -> User:
    token_str = None
    if authorization and authorization.startswith("Bearer "):
        token_str = authorization.replace("Bearer ", "").strip()
    elif token:
        token_str = token.strip()

    if not token_str:
        raise HTTPException(status_code=401, detail="Authentication token required. Please log in.")

    try:
        payload = jwt.decode(token_str, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        user = db.query(User).filter(User.id == int(user_id)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User account not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Expired or invalid authentication token")

@router.post("/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    hashed_pwd = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_pwd,
        full_name=user_data.full_name or user_data.email.split("@")[0]
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token({"sub": str(new_user.id), "email": new_user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "email": new_user.email, "full_name": new_user.full_name}
    }

@router.post("/login", response_model=Token)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token({"sub": str(user.id), "email": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email, "full_name": user.full_name}
    }

@router.get("/me")
def get_current_user(user: User = Depends(get_current_user_from_token)):
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name
        }
    }
