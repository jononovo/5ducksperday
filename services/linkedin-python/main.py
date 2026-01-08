"""
LinkedIn Voyager API Service
A lightweight FastAPI microservice that wraps the linkedin-api library.
Only accessible from the Node.js backend via internal network.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INTERNAL_AUTH_TOKEN = os.getenv("LINKEDIN_INTERNAL_TOKEN")
if not INTERNAL_AUTH_TOKEN:
    raise ValueError("LINKEDIN_INTERNAL_TOKEN environment variable is required")
PORT = int(os.getenv("LINKEDIN_SERVICE_PORT", "8001"))

active_sessions: Dict[str, Any] = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"LinkedIn service starting on port {PORT}")
    yield
    logger.info("LinkedIn service shutting down")
    active_sessions.clear()

app = FastAPI(
    title="LinkedIn Voyager Service",
    description="Internal API for LinkedIn automation",
    lifespan=lifespan
)

def verify_internal_token(x_internal_token: str = Header(...)):
    if x_internal_token != INTERNAL_AUTH_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid internal token")
    return True


class LoginRequest(BaseModel):
    email: str
    password: str
    session_id: str


class LoginResponse(BaseModel):
    success: bool
    needs_verification: bool = False
    challenge_type: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None
    cookies: Optional[Dict[str, str]] = None
    error: Optional[str] = None


class VerifyRequest(BaseModel):
    session_id: str
    pin: str


class SessionCheckRequest(BaseModel):
    session_id: str
    cookies: Dict[str, str]


class SessionCheckResponse(BaseModel):
    valid: bool
    profile: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class LogoutRequest(BaseModel):
    session_id: str


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "linkedin-voyager"}


@app.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest, _: bool = Depends(verify_internal_token)):
    """
    Attempt to log in to LinkedIn with username/password.
    May require 2FA verification.
    """
    try:
        from linkedin_api import Linkedin
        
        logger.info(f"Login attempt for session: {request.session_id}")
        
        try:
            api = Linkedin(request.email, request.password)
            
            profile = api.get_user_profile()
            
            cookies = {}
            if hasattr(api, 'client') and hasattr(api.client, 'session'):
                for cookie in api.client.session.cookies:
                    if cookie.name in ['li_at', 'JSESSIONID']:
                        cookies[cookie.name] = cookie.value
            
            active_sessions[request.session_id] = {
                'api': api,
                'profile': profile,
                'cookies': cookies,
                'created_at': datetime.now().isoformat()
            }
            
            return LoginResponse(
                success=True,
                needs_verification=False,
                profile={
                    'public_id': profile.get('miniProfile', {}).get('publicIdentifier'),
                    'first_name': profile.get('miniProfile', {}).get('firstName'),
                    'last_name': profile.get('miniProfile', {}).get('lastName'),
                    'headline': profile.get('miniProfile', {}).get('occupation'),
                    'photo_url': None
                },
                cookies=cookies
            )
            
        except Exception as login_error:
            error_str = str(login_error).lower()
            
            if 'challenge' in error_str or 'verification' in error_str or '2fa' in error_str:
                active_sessions[request.session_id] = {
                    'pending_verification': True,
                    'email': request.email,
                    'password': request.password,
                    'created_at': datetime.now().isoformat()
                }
                
                challenge_type = 'pin'
                if 'authenticator' in error_str:
                    challenge_type = 'totp'
                elif 'email' in error_str:
                    challenge_type = 'email'
                elif 'sms' in error_str:
                    challenge_type = 'sms'
                
                return LoginResponse(
                    success=False,
                    needs_verification=True,
                    challenge_type=challenge_type
                )
            
            raise login_error
            
    except ImportError:
        logger.error("linkedin-api library not installed")
        return LoginResponse(
            success=False,
            error="LinkedIn API library not available"
        )
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return LoginResponse(
            success=False,
            error=str(e)
        )


@app.post("/verify", response_model=LoginResponse)
async def verify(request: VerifyRequest, _: bool = Depends(verify_internal_token)):
    """
    Submit 2FA verification PIN.
    
    Note: The linkedin-api library handles 2FA challenges internally during login.
    This endpoint is for cases where verification is required separately.
    Due to LinkedIn's security measures, programmatic 2FA submission has limitations.
    """
    try:
        session = active_sessions.get(request.session_id)
        
        if not session:
            return LoginResponse(
                success=False,
                error="No pending verification for this session. Please start the connection process again."
            )
        
        if not session.get('pending_verification'):
            return LoginResponse(
                success=False,
                error="This session does not require verification."
            )
        
        logger.info(f"Verification attempt for session: {request.session_id}")
        
        return LoginResponse(
            success=False,
            needs_verification=True,
            error="LinkedIn 2FA verification cannot be completed programmatically. Please either: (1) Temporarily disable 2FA on your LinkedIn account, connect, then re-enable 2FA, or (2) Use an app password if available. Your session will be stored securely once connected."
        )
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        return LoginResponse(
            success=False,
            error=str(e)
        )


@app.post("/session/check", response_model=SessionCheckResponse)
async def check_session(request: SessionCheckRequest, _: bool = Depends(verify_internal_token)):
    """
    Check if stored cookies are still valid.
    """
    try:
        from linkedin_api import Linkedin
        
        logger.info(f"Session check for: {request.session_id}")
        
        if not request.cookies.get('li_at'):
            return SessionCheckResponse(
                valid=False,
                error="Missing li_at cookie"
            )
        
        try:
            api = Linkedin('', '', cookies=request.cookies)
            profile = api.get_user_profile()
            
            active_sessions[request.session_id] = {
                'api': api,
                'profile': profile,
                'cookies': request.cookies,
                'created_at': datetime.now().isoformat()
            }
            
            return SessionCheckResponse(
                valid=True,
                profile={
                    'public_id': profile.get('miniProfile', {}).get('publicIdentifier'),
                    'first_name': profile.get('miniProfile', {}).get('firstName'),
                    'last_name': profile.get('miniProfile', {}).get('lastName'),
                    'headline': profile.get('miniProfile', {}).get('occupation')
                }
            )
        except Exception as e:
            return SessionCheckResponse(
                valid=False,
                error=str(e)
            )
            
    except ImportError:
        return SessionCheckResponse(
            valid=False,
            error="LinkedIn API library not available"
        )
    except Exception as e:
        logger.error(f"Session check failed: {str(e)}")
        return SessionCheckResponse(
            valid=False,
            error=str(e)
        )


@app.post("/logout")
async def logout(request: LogoutRequest, _: bool = Depends(verify_internal_token)):
    """
    Clear session data.
    """
    if request.session_id in active_sessions:
        del active_sessions[request.session_id]
        logger.info(f"Session cleared: {request.session_id}")
    
    return {"success": True}


@app.get("/sessions/count")
async def session_count(_: bool = Depends(verify_internal_token)):
    """
    Get count of active sessions (for monitoring).
    """
    return {"count": len(active_sessions)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=PORT)
