import { useUser, useAuth as useClerkAuth } from "@clerk/nextjs";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

export interface AuthState {
  user: any | null;
  loading: boolean;
  initialized: boolean;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordFormData {
  email: string;
}

export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export function useAuth() {
  const { user: clerkUser, isLoaded } = useUser();
  const { isSignedIn } = useClerkAuth();

  // Create a user object that matches the expected interface
  const user = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress,
        user_metadata: {
          full_name: clerkUser.fullName,
        },
        created_at: clerkUser.createdAt,
      }
    : null;

  const authState: AuthState = {
    user,
    loading: !isLoaded,
    initialized: isLoaded,
  };

  // These functions are maintained for compatibility but won't be used
  // since Clerk handles authentication
  const signIn = async (formData: LoginFormData) => {
    return { data: null, error: new Error("Use Clerk authentication") };
  };

  const signUp = async (formData: RegisterFormData) => {
    return { data: null, error: new Error("Use Clerk authentication") };
  };

  const signOut = async () => {
    return { error: new Error("Use Clerk authentication") };
  };

  const resetPassword = async (email: string) => {
    return { data: null, error: new Error("Use Clerk authentication") };
  };

  const updatePassword = async (password: string) => {
    return { data: null, error: new Error("Use Clerk authentication") };
  };

  // Helper function to get Supabase client with Clerk token
  const getSupabaseWithAuth = async () => {
    if (!clerkUser || !isSupabaseConfigured()) return null;

    // You can set up RLS policies in Supabase that work with Clerk user IDs
    // For now, we'll use the basic client
    return supabase;
  };

  return {
    user: authState.user,
    loading: authState.loading,
    initialized: authState.initialized,
    isSignedIn,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    getSupabaseWithAuth,
    isSupabaseConfigured: isSupabaseConfigured(),
  };
}
