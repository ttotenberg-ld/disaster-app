from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from typing import Dict

from .models import UserCreate, UserLogin, UserUpdate, User, Token
from .database import get_user_by_email, create_user, verify_password, update_user, users_db
from .auth import create_access_token, get_current_user_id

app = FastAPI(title="Auth Demo API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/signup", response_model=User)
async def signup(user_data: UserCreate):
    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    new_user = create_user(user_data.email, user_data.password)
    
    # Return user info (excluding password)
    return {
        "id": new_user["id"],
        "email": new_user["email"],
        "fullName": new_user.get("fullName"),
        "username": new_user.get("username"),
        "website": new_user.get("website")
    }


@app.post("/api/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = get_user_by_email(form_data.username)  # username field contains email
    if not user or not verify_password(form_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user["id"]},
        expires_delta=timedelta(minutes=30)
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/me", response_model=User)
async def get_me(user_id: str = Depends(get_current_user_id)):
    if user_id not in users_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_data = users_db[user_id]
    return {
        "id": user_id,
        "email": user_data["email"],
        "fullName": user_data.get("fullName"),
        "username": user_data.get("username"),
        "website": user_data.get("website")
    }


@app.patch("/api/me", response_model=User)
async def update_me(user_update: UserUpdate, user_id: str = Depends(get_current_user_id)):
    updated_user = update_user(user_id, user_update.dict(exclude_unset=True))
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user_id,
        "email": updated_user["email"],
        "fullName": updated_user.get("fullName"),
        "username": updated_user.get("username"),
        "website": updated_user.get("website")
    } 