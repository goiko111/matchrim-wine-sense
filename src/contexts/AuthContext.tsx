
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      console.log('Attempting signup for:', email);
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            preferred_language: 'ES'
          }
        }
      });
      
      if (error) {
        console.error('Signup error:', error);
        let errorMessage = error.message;
        
        // Translate common error messages to Spanish
        if (error.message.includes('already registered')) {
          errorMessage = 'Este email ya está registrado. Intenta iniciar sesión o usa otro email.';
        } else if (error.message.includes('invalid email')) {
          errorMessage = 'El formato del email no es válido.';
        } else if (error.message.includes('weak password')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        }
        
        toast({
          title: "Error en el registro",
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }

      console.log('Signup response:', data);
      
      if (data.user && !data.session) {
        // User created but needs email confirmation
        console.log('User created, email confirmation required');
        toast({
          title: "¡Registro exitoso!",
          description: "Te hemos enviado un email de confirmación. Por favor revisa tu bandeja de entrada y spam, y haz clic en el enlace para activar tu cuenta.",
        });
      } else if (data.session) {
        // User is immediately signed in (email confirmation disabled)
        console.log('User created and signed in');
        toast({
          title: "¡Bienvenido!",
          description: "Tu cuenta ha sido creada exitosamente."
        });
      }
      
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected signup error:', error);
      toast({
        title: "Error en el registro",
        description: "Ocurrió un error inesperado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        console.error('Signin error:', error);
        let errorMessage = error.message;
        
        // Translate common error messages to Spanish
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciales incorrectas. Verifica tu email y contraseña.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.';
        }
        
        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }
      
      console.log('Signin successful for:', data.user?.email);
      toast({
        title: "¡Bienvenido de vuelta!",
        description: "Has iniciado sesión exitosamente."
      });
      
      return { error: null };
    } catch (error: any) {
      console.error('Unexpected signin error:', error);
      toast({
        title: "Error de autenticación",
        description: "Ocurrió un error inesperado. Por favor intenta de nuevo.",
        variant: "destructive"
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Signout error:', error);
        toast({
          title: "Error al cerrar sesión",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión exitosamente."
        });
      }
    } catch (error: any) {
      console.error('Unexpected signout error:', error);
      toast({
        title: "Error al cerrar sesión",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
