# Highlight requirements
import highlight_io
from highlight_io.integrations.fastapi import FastAPIMiddleware

# LaunchDarkly
import ldclient
from ldclient.config import Config
from ldclient import Context
from dotenv import load_dotenv
import os
import random


from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from datetime import timedelta
from typing import Dict, Optional

from .models import UserCreate, UserLogin, UserUpdate, User, Token
from .database import get_user_by_email, create_user, verify_password, update_user, users_db
from .auth import create_access_token, get_current_user_id

# Import additional modules for image proxy
import requests
from fastapi.responses import Response

# Load environment variables
load_dotenv()

# Initialize LaunchDarkly client
ldclient.set_config(Config(os.getenv("LD_SDK_KEY")))

# Create anonymous context helper function
def get_anonymous_context():
    return Context.create("anonymous-user", "user")

# Create user context helper function
def create_user_context(user_id: str, email: str) -> Context:
    # Create a user context with key and additional attributes
    return Context.builder(user_id).kind("user").set("email", email).build()

# Helper function to throw demo errors
def throw_demo_error(context):
    ldclient.get().track("http.500", context)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Service temporarily unavailable. Please try again later."
    )

H = highlight_io.H(
	"ejlj47ny",
	instrument_logging=True,
	service_name="disaster-app",
	service_version="1.0.8",
	environment="production",
    otlp_endpoint="https://otel.observability.app.launchdarkly.com:4317/",
    debug=True
)

app = FastAPI(title="Disaster App")
app.add_middleware(FastAPIMiddleware)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add dependency to get LD context based on authentication status
async def get_ld_context(user_id: Optional[str] = Depends(get_current_user_id)):
    if user_id and user_id in users_db:
        user_data = users_db[user_id]
        return create_user_context(user_id, user_data["email"])
    return get_anonymous_context()


@app.post("/api/signup", response_model=User)
async def signup(user_data: UserCreate):
    # Check if user already exists
    existing_user = get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create anonymous context for the new user
    anon_context = get_anonymous_context()
    
    # Check new_auth flag to determine if we should show errors
    new_auth = ldclient.get().variation("release-new-auth", anon_context, False)
    disaster_mode = ldclient.get().variation("enable-disaster-mode", anon_context, False)
    if new_auth or disaster_mode:
        # Intentionally throw an error for demo purposes
        throw_demo_error(anon_context)
    
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
    
    # Check if user exists first (without validating password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create user context for LaunchDarkly
    user_context = create_user_context(user["id"], user["email"])
    
    # Check new_auth flag to determine if we should show errors
    new_auth = ldclient.get().variation("release-new-auth", user_context, False)
    disaster_mode = ldclient.get().variation("enable-disaster-mode", user_context, False)
    if new_auth or disaster_mode:
        # Intentionally throw an error for demo purposes
        throw_demo_error(user_context)
    
    # Verify password only if we're not throwing demo errors
    if not verify_password(form_data.password, user["hashed_password"]):
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


@app.get("/api/proxy-image")
async def proxy_image(url: str):
    """
    Proxy for images to avoid CORS issues.
    Usage: /api/proxy-image?url=https://example.com/image.jpg
    """
    try:
        response = requests.get(url, timeout=5)
        return Response(
            content=response.content, 
            media_type=response.headers.get("Content-Type", "image/jpeg")
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch image: {str(e)}"
        )