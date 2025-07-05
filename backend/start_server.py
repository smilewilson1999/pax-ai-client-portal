#!/usr/bin/env python3
"""
Quick start FastAPI development server
"""
import os
import uvicorn
from dotenv import load_dotenv

load_dotenv()

if __name__ == "__main__":
    # Check environment variables
    if not os.getenv("DATABASE_URL"):
        print("⚠️  Warning: DATABASE_URL environment variable not set")
        print("Please edit .env file and set your Supabase database URL")
    
    if not os.getenv("CLERK_SECRET_KEY"):
        print("⚠️  Warning: CLERK_SECRET_KEY environment variable not set")
        print("Please edit .env file and set your Clerk secret key")
    
    print("🚀 Starting FastAPI development server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🔍 Health Check: http://localhost:8000/health")
    print("Press Ctrl+C to stop the server")
    
    # Start server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 