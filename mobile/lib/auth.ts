/**
 * KOFA Authentication - Supabase Auth Integration
 * Handles email/password authentication for merchants
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, Session, User, AuthError } from '@supabase/supabase-js';

// Supabase configuration
// In production, use EAS secrets or app.config.js with environment variables
// For development, these values are used as fallback
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dnleuqubwqoijcvbwtmp.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRubGV1cXVid3FvaWpjdmJ3dG1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1Mzg1MzcsImV4cCI6MjA4MTExNDUzN30.sZAn9SR0jwMMfEYEanxh1YY26djW89Cr4TAOPas4_e8';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Auth response type
export interface AuthResponse {
    success: boolean;
    user?: User | null;
    session?: Session | null;
    error?: string;
}

/**
 * Sign up a new user with email and password
 */
export async function signUp(
    email: string,
    password: string,
    businessName?: string
): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    business_name: businessName,
                },
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return {
            success: true,
            user: data.user,
            session: data.session,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Sign up failed',
        };
    }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return {
            success: true,
            user: data.user,
            session: data.session,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Sign in failed',
        };
    }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Sign out failed',
        };
    }
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/**
 * Get the current user
 */
export async function getCurrentUser(): Promise<User | null> {
    const { data } = await supabase.auth.getUser();
    return data.user;
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Password reset failed',
        };
    }
}

/**
 * Check if user has completed onboarding
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        return value === 'true';
    } catch {
        return false;
    }
}

/**
 * Mark onboarding as complete
 */
export async function setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
}

export default {
    supabase,
    signUp,
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    resetPassword,
    hasCompletedOnboarding,
    setOnboardingComplete,
};
