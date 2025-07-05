from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List
from datetime import datetime
import uuid
from models import (
    Claim, ClaimCreate, ClaimUpdate, User, ClaimTemplate,
    ClaimResponse, DocumentNode, DocumentType
)
from database import get_session
from auth_utils import get_current_user
from supabase_client import get_supabase_client

router = APIRouter(
    prefix="/claims",
    tags=["claims"],
    responses={404: {"description": "Not found"}},
)

def claim_to_response(claim: Claim) -> ClaimResponse:
    """Convert Claim Model to ClaimResponse"""
    return ClaimResponse(
        id=claim.id,
        name=claim.name,
        status=claim.status,
        templateType=claim.template_type,
        userId=claim.user_id,
        createdAt=claim.created_at,
        updatedAt=claim.updated_at
    )

@router.get("/", response_model=List[ClaimResponse])
async def get_claims(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get all claims for the authenticated user
    """
    statement = select(Claim).where(Claim.user_id == current_user.id)
    claims = session.exec(statement).all()
    return [claim_to_response(claim) for claim in claims]

@router.get("/{claim_id}", response_model=ClaimResponse)
async def get_claim(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get a single claim by ID
    """
    statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    return claim_to_response(claim)

@router.post("/", response_model=ClaimResponse)
async def create_claim(
    claim_data: ClaimCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new claim
    """
    # Get template
    template_statement = select(ClaimTemplate).where(
        ClaimTemplate.id == claim_data.template_id
    )
    template = session.exec(template_statement).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    # Create new claim
    new_claim = Claim(
        id=f"claim-{uuid.uuid4()}",
        name=claim_data.name,
        status=claim_data.status,
        template_type=template.name,
        user_id=current_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(new_claim)
    session.commit()
    session.refresh(new_claim)
    
    return claim_to_response(new_claim)

@router.patch("/{claim_id}", response_model=ClaimResponse)
async def update_claim(
    claim_id: str,
    claim_update: ClaimUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Update a claim's details (e.g., rename)
    """
    statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    # Update fields
    update_data = claim_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(claim, field, value)
    
    claim.updated_at = datetime.utcnow()
    
    session.add(claim)
    session.commit()
    session.refresh(claim)
    
    return claim_to_response(claim)

@router.delete("/{claim_id}")
async def delete_claim(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete a claim and all its associated documents
    """
    statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    # Get all documents for this claim
    documents_statement = select(DocumentNode).where(DocumentNode.claim_id == claim_id)
    documents = session.exec(documents_statement).all()
    
    # Delete files from Supabase Storage first
    supabase = get_supabase_client()
    if supabase:
        files_to_delete = []
        for doc in documents:
            if doc.type == DocumentType.FILE and doc.file_url and not doc.file_url.startswith("/demo/"):
                files_to_delete.append(doc.file_url)
        
        if files_to_delete:
            try:
                # Delete files from Supabase Storage
                result = supabase.storage.from_("documents").remove(files_to_delete)
                print(f"🗑️ Deleted {len(files_to_delete)} files from Supabase Storage")
            except Exception as e:
                print(f"⚠️ Warning: Failed to delete some files from Supabase Storage: {str(e)}")
                # Continue with database deletion even if storage deletion fails
    
    # Delete all documents from database (this will cascade delete if configured)
    for doc in documents:
        session.delete(doc)
    
    # Delete claim from database
    session.delete(claim)
    session.commit()
    
    return {"message": "Claim and all associated files deleted successfully"} 