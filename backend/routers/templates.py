from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from typing import List

from models import ClaimTemplate, ClaimTemplateCreate, ClaimTemplateResponse
from database import get_session

router = APIRouter(
    prefix="/templates",
    tags=["templates"],
    responses={404: {"description": "Not found"}},
)

def template_to_response(template: ClaimTemplate) -> ClaimTemplateResponse:
    """Convert ClaimTemplate to ClaimTemplateResponse"""
    return ClaimTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        requiredDocuments=template.required_documents_list,
        createdAt=template.created_at,
        updatedAt=template.updated_at
    )

@router.get("/", response_model=List[ClaimTemplateResponse])
async def get_claim_templates(
    session: Session = Depends(get_session)
):
    """
    Get all available claim templates
    """
    statement = select(ClaimTemplate)
    templates = session.exec(statement).all()
    return [template_to_response(template) for template in templates]

@router.get("/{template_id}", response_model=ClaimTemplateResponse)
async def get_claim_template(
    template_id: str,
    session: Session = Depends(get_session)
):
    """
    Get a specific claim template by ID
    """
    statement = select(ClaimTemplate).where(ClaimTemplate.id == template_id)
    template = session.exec(statement).first()
    
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )
    
    return template_to_response(template)

@router.post("/", response_model=ClaimTemplateResponse)
async def create_claim_template(
    template_data: ClaimTemplateCreate,
    session: Session = Depends(get_session)
):
    """
    Create a new claim template (admin endpoint)
    """
    import json
    new_template = ClaimTemplate(
        id=f"template-{template_data.name.lower().replace(' ', '-')}",
        name=template_data.name,
        description=template_data.description,
        required_documents=json.dumps(template_data.required_documents)
    )
    
    session.add(new_template)
    session.commit()
    session.refresh(new_template)
    
    return template_to_response(new_template) 