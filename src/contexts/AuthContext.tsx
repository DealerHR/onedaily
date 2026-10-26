import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Profile } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string, organization: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  trackToolUsage: (toolName: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (() => {
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    console.log('Loading profile for userId:', userId);

    const { data: { session } } = await supabase.auth.getSession();
    console.log('Current session:', session);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    console.log('Profile query result:', { data, error });

    if (!error && data) {
      console.log('Profile loaded successfully:', data);
      console.log('is_admin value:', data.is_admin);

      if (data.is_active === false) {
        console.warn('User account is deactivated');
        await supabase.auth.signOut();
        alert('Your account has been deactivated. Please contact support for assistance.');
        setProfile(null);
        setUser(null);
      } else {
        setProfile(data);
      }
    } else if (error) {
      console.error('Error loading profile:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.warn('No profile found for user:', userId);
    }
    setLoading(false);
  };

  const signUp = async (email: string, password: string, fullName: string, organization: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            organization,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: upsertError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: data.user.id,
              email: data.user.email!,
              full_name: fullName,
              organization,
            },
            { onConflict: 'id' }
          );

        if (upsertError) throw upsertError;

        await new Promise(resolve => setTimeout(resolve, 500));
        await loadProfile(data.user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const trackToolUsage = async (toolName: string) => {
    if (!user) return;

    await supabase
      .from('tool_usage')
      .insert([
        {
          user_id: user.id,
          tool_name: toolName,
        },
      ]);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const isAdmin = profile?.is_admin ?? false;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, signUp, signIn, signOut, trackToolUsage, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
