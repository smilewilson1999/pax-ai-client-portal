from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import uuid
import os
import io
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models import (
    DocumentNode, DocumentNodeCreate, DocumentNodeUpdate, 
    User, Claim, DocumentType, DocumentStatus
)
from database import get_session
from auth_utils import get_current_user
from supabase_client import get_supabase_client, is_supabase_configured

router = APIRouter(
    prefix="/documents",
    tags=["documents"],
    responses={404: {"description": "Not found"}},
)

def build_document_tree(documents: List[DocumentNode]) -> List[dict]:
    """
    Helper function to build document tree structure
    """
    doc_map = {}
    root_docs = []
    
    # Create a map of all documents
    for doc in documents:
        doc_dict = {
            "id": doc.id,
            "name": doc.name,
            "type": doc.type,
            "claimId": doc.claim_id,
            "parentId": doc.parent_id,
            "status": doc.status,
            "fileUrl": doc.file_url,
            "fileType": doc.file_type,
            "createdAt": doc.created_at.isoformat(),
            "updatedAt": doc.updated_at.isoformat(),
            "statusMessage": doc.status_message,
            "statusIcon": doc.status_icon,
            "children": []
        }
        doc_map[doc.id] = doc_dict
    
    # Build the tree structure
    for doc_dict in doc_map.values():
        if doc_dict["parentId"] is None:
            root_docs.append(doc_dict)
        else:
            parent = doc_map.get(doc_dict["parentId"])
            if parent:
                parent["children"].append(doc_dict)
    
    return root_docs

@router.get("/claims/{claim_id}/documents")
async def get_claim_documents(
    claim_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get the document/folder tree for a specific claim
    """
    # Verify claim belongs to user
    claim_statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(claim_statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    # Get all documents for this claim
    statement = select(DocumentNode).where(DocumentNode.claim_id == claim_id)
    documents = session.exec(statement).all()
    
    # Build and return tree structure
    return build_document_tree(documents)

@router.post("/folder")
async def create_folder(
    claim_id: str = Form(...),
    parent_id: Optional[str] = Form(None),
    name: str = Form(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Create a new folder within a claim
    """
    # Verify claim belongs to user
    claim_statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(claim_statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    # Verify parent exists if provided
    if parent_id:
        parent_statement = select(DocumentNode).where(
            DocumentNode.id == parent_id,
            DocumentNode.claim_id == claim_id
        )
        parent = session.exec(parent_statement).first()
        
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
    
    # Create new folder
    new_folder = DocumentNode(
        id=f"doc-{uuid.uuid4()}",
        name=name,
        type=DocumentType.FOLDER,
        claim_id=claim_id,
        parent_id=parent_id,
        status=DocumentStatus.UPLOADED,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(new_folder)
    session.commit()
    session.refresh(new_folder)
    
    return {
        "id": new_folder.id,
        "name": new_folder.name,
        "type": new_folder.type,
        "claimId": new_folder.claim_id,
        "parentId": new_folder.parent_id,
        "status": new_folder.status,
        "createdAt": new_folder.created_at.isoformat(),
        "updatedAt": new_folder.updated_at.isoformat(),
        "children": []
    }

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    claim_id: str = Form(...),
    parent_id: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Handle file uploads
    """
    # Verify claim belongs to user
    claim_statement = select(Claim).where(
        Claim.id == claim_id,
        Claim.user_id == current_user.id
    )
    claim = session.exec(claim_statement).first()
    
    if not claim:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Claim not found"
        )
    
    # Verify parent exists if provided
    if parent_id:
        parent_statement = select(DocumentNode).where(
            DocumentNode.id == parent_id,
            DocumentNode.claim_id == claim_id
        )
        parent = session.exec(parent_statement).first()
        
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found"
            )
    
    # Upload to Supabase Storage if configured
    supabase = get_supabase_client()
    if supabase:
        try:
            # Read file content
            file_content = await file.read()
            file.file.seek(0)  # Reset file pointer for potential re-use
            
            # Build the full path including parent folder hierarchy
            def build_folder_path(parent_id: str, session: Session) -> str:
                """Recursively build the folder path from root to parent"""
                if not parent_id:
                    return ""
                
                parent_statement = select(DocumentNode).where(DocumentNode.id == parent_id)
                parent = session.exec(parent_statement).first()
                
                if not parent:
                    return ""
                
                # Recursively get parent path
                parent_path = build_folder_path(parent.parent_id, session) if parent.parent_id else ""
                
                # Combine with current folder name (sanitize for file system)
                folder_name = parent.name.replace("/", "_").replace("\\", "_")
                
                if parent_path:
                    return f"{parent_path}/{folder_name}"
                else:
                    return folder_name
            
            # Generate file path with proper folder hierarchy
            file_extension = file.filename.split('.')[-1].lower() if '.' in file.filename else 'bin'
            folder_path = build_folder_path(parent_id, session) if parent_id else ""
            unique_filename = f"{uuid.uuid4()}.{file_extension}"
            
            # Combine claim_id, folder path, and filename
            if folder_path:
                full_path = f"{claim_id}/{folder_path}/{unique_filename}"
            else:
                full_path = f"{claim_id}/{unique_filename}"
            
            print(f"📁 Uploading file to Supabase path: {full_path}")
            
            # Upload to Supabase Storage
            result = supabase.storage.from_("documents").upload(
                full_path, 
                file_content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            if hasattr(result, 'error') and result.error:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Failed to upload file: {result.error.message}"
                )
            file_url = full_path  # Store the full path for later retrieval
            file_type = file_extension
            upload_status = DocumentStatus.UPLOADED  # Successfully uploaded
            
        except HTTPException:
            # Re-raise HTTP exceptions
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File upload failed"
            )
    else:
        # Debug why Supabase is not available
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        print(f"Supabase not available during upload:")
        print(f"SUPABASE_URL: {'✓' if supabase_url else '✗'}")
        print(f"SUPABASE_ANON_KEY: {'✓' if supabase_anon_key else '✗'}")
        print(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if supabase_service_key else '✗'}")
        
        # Fallback to demo mode
        file_url = f"/demo/{file.filename}"
        file_type = file.filename.split('.')[-1].lower() if '.' in file.filename else None
        upload_status = DocumentStatus.PROCESSING  # Demo mode
    
    # Create new file document
    new_file = DocumentNode(
        id=f"doc-{uuid.uuid4()}",
        name=file.filename,
        type=DocumentType.FILE,
        claim_id=claim_id,
        parent_id=parent_id,
        status=upload_status,  # Use appropriate status
        file_url=file_url,
        file_type=file_type,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(new_file)
    session.commit()
    session.refresh(new_file)
    
    return {
        "id": new_file.id,
        "name": new_file.name,
        "type": new_file.type,
        "claimId": new_file.claim_id,
        "parentId": new_file.parent_id,
        "status": new_file.status,
        "fileUrl": new_file.file_url,
        "fileType": new_file.file_type,
        "createdAt": new_file.created_at.isoformat(),
        "updatedAt": new_file.updated_at.isoformat(),
        "children": []
    }

@router.patch("/{document_id}", response_model=dict)
async def rename_document(
    document_id: str,
    update_data: DocumentNodeUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Rename a file or folder
    """
    # Get document and verify ownership through claim
    statement = select(DocumentNode).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Update fields
    update_fields = update_data.dict(exclude_unset=True)
    for field, value in update_fields.items():
        setattr(document, field, value)
    
    document.updated_at = datetime.utcnow()
    
    session.add(document)
    session.commit()
    session.refresh(document)
    
    return {
        "id": document.id,
        "name": document.name,
        "type": document.type,
        "claimId": document.claim_id,
        "parentId": document.parent_id,
        "status": document.status,
        "fileUrl": document.file_url,
        "fileType": document.file_type,
        "createdAt": document.created_at.isoformat(),
        "updatedAt": document.updated_at.isoformat(),
        "statusMessage": document.status_message,
        "statusIcon": document.status_icon
    }

@router.delete("/{document_id}")
async def delete_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Delete a file or folder (and its children if it's a folder)
    """
    # Get document and verify ownership through claim
    statement = select(DocumentNode).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Find all children recursively (for folder deletion)
    def get_all_children(parent_id: str) -> List[DocumentNode]:
        children_statement = select(DocumentNode).where(
            DocumentNode.parent_id == parent_id
        )
        children = session.exec(children_statement).all()
        
        all_children = list(children)
        for child in children:
            if child.type == DocumentType.FOLDER:
                all_children.extend(get_all_children(child.id))
        
        return all_children
    
    # Get all documents to delete
    to_delete = [document]
    if document.type == DocumentType.FOLDER:
        to_delete.extend(get_all_children(document.id))
    
    # Delete files from Supabase Storage first
    supabase = get_supabase_client()
    if supabase:
        files_to_delete = []
        for doc in to_delete:
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
    
    # Delete all documents from database
    for doc in to_delete:
        session.delete(doc)
    
    session.commit()
    
    return {"message": "Document and associated files deleted successfully"}

@router.patch("/{document_id}/move", response_model=dict)
async def move_document(
    document_id: str,
    new_parent_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Move a file or folder to a new parent directory
    """
    # Get document and verify ownership through claim
    statement = select(DocumentNode).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )
    
    # Verify new parent exists and belongs to same claim if provided
    if new_parent_id:
        parent_statement = select(DocumentNode).where(
            DocumentNode.id == new_parent_id,
            DocumentNode.claim_id == document.claim_id
        )
        parent = session.exec(parent_statement).first()
        
        if not parent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="New parent folder not found"
            )
        
        if parent.type != DocumentType.FOLDER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Parent must be a folder"
            )
    
    # Update parent_id
    document.parent_id = new_parent_id
    document.updated_at = datetime.utcnow()
    
    session.add(document)
    session.commit()
    session.refresh(document)
    
    return {
        "id": document.id,
        "name": document.name,
        "type": document.type,
        "claimId": document.claim_id,
        "parentId": document.parent_id,
        "status": document.status,
        "fileUrl": document.file_url,
        "fileType": document.file_type,
        "createdAt": document.created_at.isoformat(),
        "updatedAt": document.updated_at.isoformat(),
        "statusMessage": document.status_message,
        "statusIcon": document.status_icon
    }

@router.get("/{document_id}/download")
async def download_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Download a file by document ID
    """
    # Get document and verify ownership through claim
    statement = select(DocumentNode).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id,
        DocumentNode.type == DocumentType.FILE
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if Supabase is configured
    supabase = get_supabase_client()
    if not supabase:
        # Debug Supabase configuration
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_anon_key = os.getenv("SUPABASE_ANON_KEY")
        supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        print(f"Supabase configuration debug:")
        print(f"SUPABASE_URL: {'✓' if supabase_url else '✗'}")
        print(f"SUPABASE_ANON_KEY: {'✓' if supabase_anon_key else '✗'}")
        print(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if supabase_service_key else '✗'}")
        
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="File storage service not configured - check environment variables"
        )
    
    # Check if file_url exists
    if not document.file_url:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File path not found in database"
        )
    
    # For demo files, return error
    if document.file_url.startswith("/demo/"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo file not found - please upload a real file"
        )
    
    try:
        # Download from Supabase Storage
        result = supabase.storage.from_("documents").download(document.file_url)
        
        # Handle different response formats from Supabase library
        if hasattr(result, 'error') and result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to download file from storage: {result.error}"
            )
        
        # Get the actual file data - newer Supabase library returns bytes directly
        file_data = result if isinstance(result, bytes) else (result.data if hasattr(result, 'data') else result)
        
        if not file_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File data not found in storage"
            )
        
        # Get file extension for media type (optimized)
        file_extension = document.file_type or (document.name.split(".")[-1].lower() if "." in document.name else "")
        
        # Determine media type (optimized with dict lookup)
        media_type_map = {
            "png": "image/png",
            "jpg": "image/jpeg", 
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "bmp": "image/bmp",
            "webp": "image/webp",
            "pdf": "application/pdf",
            "txt": "text/plain",
            "csv": "text/plain",
            "json": "application/json"
        }
        media_type = media_type_map.get(file_extension, "application/octet-stream")
        
        # Add cache headers for better performance
        cache_headers = {
            "Content-Disposition": f"attachment; filename={document.name}",
            "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            "ETag": f'"{document.id}-{int(document.updated_at.timestamp())}"'  # Simple ETag
        }
        
        # Return the actual file data from Supabase
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=media_type,
            headers=cache_headers
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log error for debugging but don't expose details to user
        print(f"Download error for {document_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Download failed"
        )

@router.get("/{document_id}/preview")
async def preview_file(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Fast preview endpoint that streams file directly for inline viewing
    """
    # Get document and verify ownership through claim
    statement = select(DocumentNode).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id,
        DocumentNode.type == DocumentType.FILE
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Check if Supabase is configured
    supabase = get_supabase_client()
    if not supabase or not document.file_url or document.file_url.startswith("/demo/"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not available for preview"
        )
    
    try:
        # Download from Supabase Storage
        result = supabase.storage.from_("documents").download(document.file_url)
        
        if hasattr(result, 'error') and result.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to load preview"
            )
        
        file_data = result if isinstance(result, bytes) else (result.data if hasattr(result, 'data') else result)
        
        if not file_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File data not found"
            )
        
        # Get media type for preview
        file_extension = document.file_type or (document.name.split(".")[-1].lower() if "." in document.name else "")
        media_type_map = {
            "png": "image/png",
            "jpg": "image/jpeg", 
            "jpeg": "image/jpeg",
            "gif": "image/gif",
            "bmp": "image/bmp",
            "webp": "image/webp",
            "pdf": "application/pdf"
        }
        media_type = media_type_map.get(file_extension, "application/octet-stream")
        
        # Optimized headers for preview (inline display + caching)
        preview_headers = {
            "Content-Disposition": "inline",  # Display inline for preview
            "Cache-Control": "public, max-age=7200",  # Cache for 2 hours (longer for previews)
            "ETag": f'"{document.id}-{int(document.updated_at.timestamp())}"',
            "X-Content-Type-Options": "nosniff"
        }
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type=media_type,
            headers=preview_headers
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Preview failed"
        )

@router.get("/{document_id}/preview-url")
async def get_preview_url(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    """
    Get a preview URL for a document - now points to optimized preview endpoint
    """
    # Simple validation without heavy database query
    statement = select(DocumentNode.id, DocumentNode.file_url).join(Claim).where(
        DocumentNode.id == document_id,
        Claim.user_id == current_user.id,
        DocumentNode.type == DocumentType.FILE
    )
    document = session.exec(statement).first()
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )
    
    # Return optimized preview endpoint
    return {
        "url": f"/api/documents/{document_id}/preview",
        "requires_auth": True,
        "headers": {}
    }