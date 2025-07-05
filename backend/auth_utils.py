import os
import requests
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select
from typing import Optional
import json
from jose import JWTError, jwt
from models import User, UserCreate
from database import get_session

# Clerk configuration
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY")
CLERK_PUBLISHABLE_KEY = os.getenv("CLERK_PUBLISHABLE_KEY")

if not CLERK_SECRET_KEY:
    raise ValueError("CLERK_SECRET_KEY environment variable is required")

# Bearer token scheme
security = HTTPBearer()

class ClerkUser:
    """Represents a Clerk user from JWT token"""
    def __init__(self, user_id: str, email: str, name: str):
        self.user_id = user_id
        self.email = email
        self.name = name

def verify_clerk_token(token: str) -> ClerkUser:
    """
    Verify Clerk JWT token and extract user information
    """
    try:
        print(f"🔍 Verifying token: {token[:20]}...")
        
        # In production, implement proper JWT verification with JWKS
        payload = jwt.decode(
            token, 
            key="dummy_key",  # Required parameter even when verification is disabled
            algorithms=["RS256"],  # Clerk uses RS256
            options={"verify_signature": False, "verify_aud": False, "verify_exp": False}
        )
        
        print(f"📋 JWT payload: {payload}")
        
        user_id = payload.get("sub")
        email = payload.get("email", payload.get("email_addresses", [{}])[0].get("email_address", ""))
        name = payload.get("name", payload.get("first_name", ""))
        
        print(f"👤 Extracted user info - ID: {user_id}, Email: {email}, Name: {name}")
        
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing user ID"
            )
            
        return ClerkUser(user_id=user_id, email=email or "", name=name or "")
        
    except JWTError as e:
        print(f"❌ JWT Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {str(e)}"
        )
    except Exception as e:
        print(f"❌ Auth Error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )

def get_current_clerk_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> ClerkUser:
    """
    FastAPI dependency to get current authenticated Clerk user
    """
    return verify_clerk_token(credentials.credentials)

def get_or_create_user(
    clerk_user: ClerkUser = Depends(get_current_clerk_user),
    session: Session = Depends(get_session)
) -> User:
    """
    Get or create user in our database based on Clerk user
    """
    # Check if user exists
    statement = select(User).where(User.clerk_user_id == clerk_user.user_id)
    db_user = session.exec(statement).first()
    
    if not db_user:
        # Create new user
        user_create = UserCreate(
            clerk_user_id=clerk_user.user_id,
            name=clerk_user.name,
            email=clerk_user.email
        )
        db_user = User.from_orm(user_create)
        db_user.id = f"user-{clerk_user.user_id}"
        
        session.add(db_user)
        session.commit()
        session.refresh(db_user)
    
    return db_user

# Auth dependency for protected routes
def get_current_user(
    user: User = Depends(get_or_create_user)
) -> User:
    """
    FastAPI dependency for protected routes that require authentication
    """
    return user 