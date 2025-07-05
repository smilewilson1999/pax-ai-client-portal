import os
from sqlmodel import SQLModel, create_engine, Session
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

# Create SQLModel engine
# For psycopg3, we need to specify the driver explicitly
if DATABASE_URL and not DATABASE_URL.startswith("postgresql+psycopg://"):
    # Convert postgresql:// to postgresql+psycopg:// for psycopg3
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    DATABASE_URL,
    echo=True if os.getenv("ENVIRONMENT") == "development" else False,
    pool_pre_ping=True,
    pool_recycle=300,
    # Additional connection args for psycopg3
    connect_args={"sslmode": "prefer"}
)

# Database session dependency
def get_session():
    """
    Database session dependency for FastAPI endpoints
    """
    with Session(engine) as session:
        yield session

# Create all tables
def create_tables():
    """
    Create all database tables
    """
    # Import all models to register them with SQLModel metadata
    from models import User, Claim, DocumentNode, ClaimTemplate, Notification
    SQLModel.metadata.create_all(engine) 