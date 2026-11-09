
import { authErrorText135 } from '@/utils/authErrorText135';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { buildPasswordResetRedirect, buildSignupRedirect } from '@/utils/authRedirect';
import { reconcileMatchrimLocalOwner } from '@/utils/matchrimLocalOwner';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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
        reconcileMatchrimLocalOwner(session?.user?.id ?? null, event === 'SIGNED_OUT');
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      reconcileMatchrimLocalOwner(session?.user?.id ?? null);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    try {
      const redirectUrl = buildSignupRedirect();

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
        const raw = error.message.toLowerCase();
        if (raw.includes('already registered')) {
          errorMessage = 'Este email ya está registrado. Intenta iniciar sesión o usa otro email.';
        } else if (raw.includes('invalid email') || (raw.includes('email') && raw.includes('invalid'))) {
          errorMessage = 'El formato del email no es válido.';
        } else if (raw.includes('weak password') || raw.includes('password should be') || raw.includes('password is too')) {
          errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
        } else if (raw.includes('rate limit') || raw.includes('too many')) {
          errorMessage = 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
        } else if (raw.includes('failed to fetch') || raw.includes('load failed') || raw.includes('network')) {
          errorMessage = 'No hay conexión. Comprueba la red y vuelve a intentarlo.';
        } else {
          errorMessage = 'No se ha podido crear la cuenta. Inténtalo de nuevo.';
        }
        
        toast({
          title: "Error en el registro",
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }

      
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
        } else if (Capacitor.isNativePlatform()) {
          errorMessage = authErrorText135(error.message, 'No se ha podido iniciar sesión. Inténtalo de nuevo.');
        }
        
        toast({
          title: "Error de autenticación",
          description: errorMessage,
          variant: "destructive"
        });
        return { error };
      }
      
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
      let { error } = await supabase.auth.signOut();
      // 134: without coverage the global sign-out fails before the session is removed and the
      // iPhone stayed signed in. The app then closes the session on this device only.
      if (error && Capacitor.isNativePlatform()) {
        console.error('Signout error, closing the session on this device:', error);
        ({ error } = await supabase.auth.signOut({ scope: 'local' }));
      }
      if (error) {
        console.error('Signout error:', error);
        toast({
          title: "Error al cerrar sesión",
          description: Capacitor.isNativePlatform() ? "No se ha podido cerrar la sesión. Inténtalo de nuevo." : error.message,
          variant: "destructive"
        });
        return false;
      } else {
        toast({
          title: "Sesión cerrada",
          description: "Has cerrado sesión exitosamente."
        });
        return true;
      }
    } catch (error: any) {
      console.error('Unexpected signout error:', error);
      toast({
        title: "Error al cerrar sesión",
        description: "Ocurrió un error inesperado.",
        variant: "destructive"
      });
      return false;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildPasswordResetRedirect(),
      });
      if (error) {
        toast({ title: 'Error', description: Capacitor.isNativePlatform() ? authErrorText135(error.message, 'No se ha podido enviar el enlace. Inténtalo de nuevo.') : error.message, variant: 'destructive' });
      }
      return { error };
    } catch (error: any) {
      toast({ title: 'Error', description: Capacitor.isNativePlatform() ? authErrorText135(error?.message, 'No se ha podido enviar el enlace. Inténtalo de nuevo.') : error?.message ?? 'Unexpected', variant: 'destructive' });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
