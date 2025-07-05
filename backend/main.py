from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
from dotenv import load_dotenv

# Import database and models
from database import create_tables
from models import *  # Import all models to ensure they are registered

# Import routers
from routers import claims, documents, users, notifications, templates

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="PAX Client Portal API",
    description="Backend API for PAX Client Portal using FastAPI and Supabase",
    version="1.0.0"
)

# Configure CORS
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(claims.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(templates.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "PAX Client Portal API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

# Create database tables on startup
@app.on_event("startup")
async def startup_event():
    """
    Create database tables on application startup
    """
    try:
        create_tables()
        print("Database tables created successfully")
    except Exception as e:
        print(f"Error creating database tables: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
