import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Warning: Supabase configuration missing. Using demo mode.")
    print(f"SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
    print(f"SUPABASE_SERVICE_ROLE_KEY: {'✓' if SUPABASE_SERVICE_ROLE_KEY else '✗'}")
    supabase_client = None
else:
    print("✓ Supabase configuration found. Initializing client...")
    print(f"SUPABASE_URL: {SUPABASE_URL}")
    # Use service role key for backend operations
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    print("✓ Supabase client initialized successfully")

def get_supabase_client() -> Client:
    """
    Get Supabase client instance
    Returns None if not configured (demo mode)
    """
    return supabase_client

def is_supabase_configured() -> bool:
    """
    Check if Supabase is properly configured
    """
    return supabase_client is not None 