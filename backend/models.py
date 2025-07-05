from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from enum import Enum
import json

# Enum definitions
class ClaimStatus(str, Enum):
    IN_PROGRESS = "InProgress"
    ACTION_REQUIRED = "ActionRequired"
    COMPLETED = "Completed"

class DocumentStatus(str, Enum):
    UPLOADED = "Uploaded"
    PROCESSING = "Processing"
    VALIDATED = "Validated"
    ERROR = "Error"

class DocumentType(str, Enum):
    FOLDER = "folder"
    FILE = "file"

class NotificationType(str, Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

# User Model
class UserBase(SQLModel):
    name: str
    email: str
    company: Optional[str] = None

class User(UserBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    clerk_user_id: str = Field(unique=True, index=True)  # Link to Clerk user ID
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    claims: List["Claim"] = Relationship(back_populates="user")
    notifications: List["Notification"] = Relationship(back_populates="user")

class UserCreate(UserBase):
    clerk_user_id: str

class UserUpdate(SQLModel):
    name: Optional[str] = None
    email: Optional[str] = None
    company: Optional[str] = None

# Claim Model
class ClaimBase(SQLModel):
    name: str
    status: ClaimStatus = ClaimStatus.IN_PROGRESS
    template_type: str

class Claim(ClaimBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="claims")
    documents: List["DocumentNode"] = Relationship(back_populates="claim")

class ClaimCreate(SQLModel):
    name: str
    template_id: str
    status: ClaimStatus = ClaimStatus.IN_PROGRESS

class ClaimUpdate(SQLModel):
    name: Optional[str] = None
    status: Optional[ClaimStatus] = None

# Document Node Model (Self-referencing for file/folder hierarchy)
class DocumentNodeBase(SQLModel):
    name: str
    type: DocumentType
    status: DocumentStatus = DocumentStatus.UPLOADED
    file_url: Optional[str] = None
    file_type: Optional[str] = None
    status_message: Optional[str] = None
    status_icon: Optional[str] = None

class DocumentNode(DocumentNodeBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    claim_id: str = Field(foreign_key="claim.id")
    parent_id: Optional[str] = Field(default=None, foreign_key="documentnode.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    claim: Claim = Relationship(back_populates="documents")
    parent: Optional["DocumentNode"] = Relationship(
        back_populates="children", 
        sa_relationship_kwargs={"remote_side": "DocumentNode.id"}
    )
    children: List["DocumentNode"] = Relationship(back_populates="parent")

class DocumentNodeCreate(DocumentNodeBase):
    claim_id: str
    parent_id: Optional[str] = None

class DocumentNodeUpdate(SQLModel):
    name: Optional[str] = None
    status: Optional[DocumentStatus] = None
    file_url: Optional[str] = None
    status_message: Optional[str] = None
    status_icon: Optional[str] = None
    parent_id: Optional[str] = None

# Claim Template Model
class ClaimTemplateBase(SQLModel):
    name: str
    description: str
    required_documents: str = Field(default="[]")  # JSON string to store list

class ClaimTemplate(ClaimTemplateBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    @property
    def required_documents_list(self) -> List[str]:
        """Convert JSON string to list"""
        try:
            return json.loads(self.required_documents)
        except (json.JSONDecodeError, TypeError):
            return []
    
    @required_documents_list.setter
    def required_documents_list(self, value: List[str]):
        """Convert list to JSON string"""
        self.required_documents = json.dumps(value)

class ClaimTemplateCreate(SQLModel):
    name: str
    description: str
    required_documents: List[str] = Field(default_factory=list)

# Notification Model
class NotificationBase(SQLModel):
    title: str
    message: str
    type: NotificationType
    is_read: bool = False

class Notification(NotificationBase, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="notifications")

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationUpdate(SQLModel):
    is_read: Optional[bool] = None

# API Response Models (Serialize to the frontend)
class ClaimResponse(SQLModel):
    id: str
    name: str
    status: ClaimStatus
    templateType: str = Field(alias="template_type")
    userId: str = Field(alias="user_id")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    class Config:
        allow_population_by_field_name = True

class ClaimTemplateResponse(SQLModel):
    id: str
    name: str
    description: str
    requiredDocuments: List[str] = Field(alias="required_documents_list")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    class Config:
        allow_population_by_field_name = True

class DocumentNodeResponse(SQLModel):
    id: str
    name: str
    type: DocumentType
    claimId: str = Field(alias="claim_id")
    parentId: Optional[str] = Field(alias="parent_id")
    status: DocumentStatus
    fileUrl: Optional[str] = Field(alias="file_url")
    fileType: Optional[str] = Field(alias="file_type")
    statusMessage: Optional[str] = Field(alias="status_message")
    statusIcon: Optional[str] = Field(alias="status_icon")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    children: Optional[List["DocumentNodeResponse"]] = None
    
    class Config:
        allow_population_by_field_name = True

class UserResponse(SQLModel):
    id: str
    name: str
    email: str
    company: Optional[str] = None
    clerkUserId: str = Field(alias="clerk_user_id")
    createdAt: datetime = Field(alias="created_at")
    updatedAt: datetime = Field(alias="updated_at")
    
    class Config:
        allow_population_by_field_name = True

class NotificationResponse(SQLModel):
    id: str
    title: str
    message: str
    type: NotificationType
    isRead: bool = Field(alias="is_read")
    userId: str = Field(alias="user_id")
    createdAt: datetime = Field(alias="created_at")
    
    class Config:
        allow_population_by_field_name = True 