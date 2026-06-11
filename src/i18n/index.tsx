import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'ES' | 'EN' | 'FR';

type Dict = Record<string, string>;
type Dictionaries = Record<Locale, Dict>;

const dictionaries: Dictionaries = {
  ES: {
    'common.back': 'Volver',
    'common.continue': 'Continuar',
    'common.cancel': 'Cancelar',
    'common.loading': 'Cargando...',
    'common.language': 'Idioma',
    'auth.title': 'Bienvenido',
    'auth.subtitle': 'Inicia sesión o crea una cuenta para guardar tus resultados',
    'auth.login': 'Iniciar Sesión',
    'auth.register': 'Registrarse',
    'auth.email': 'Email',
    'auth.password': 'Contraseña',
    'auth.signIn': 'Iniciar Sesión',
    'auth.signingIn': 'Iniciando sesión...',
    'auth.createAccount': 'Crear Cuenta Completa',
    'auth.forgotPassword': '¿Olvidaste tu contraseña?',
    'auth.tagline': 'Descubre tu perfil de vino perfecto',
    'auth.signupHint': 'Crea tu cuenta y descubre tu perfil de vino personalizado',
    'auth.signupNote': 'El registro incluye preferencias de vino, sabores y experiencias personalizadas',
    'recover.title': 'Recuperar contraseña',
    'recover.subtitle': 'Te enviaremos un enlace para crear una nueva contraseña.',
    'recover.send': 'Enviar enlace',
    'recover.sending': 'Enviando...',
    'recover.sent': 'Si el email existe, recibirás un enlace en breve.',
    'recover.backToLogin': 'Volver a iniciar sesión',
    'reset.title': 'Establecer nueva contraseña',
    'reset.subtitle': 'Escribe tu nueva contraseña para acceder a tu cuenta.',
    'reset.newPassword': 'Nueva contraseña',
    'reset.update': 'Actualizar contraseña',
    'reset.updating': 'Actualizando...',
    'reset.success': 'Contraseña actualizada. Redirigiendo...',
    'reset.invalidLink': 'El enlace no es válido o ha caducado. Solicita uno nuevo.',
    'reg.basic.firstName': 'Nombre',
    'reg.basic.lastName': 'Apellido',
    'reg.basic.phone': 'Teléfono',
    'reg.basic.preferredLanguage': 'Idioma Preferido',
    'reg.basic.location': 'Ubicación',
    'reg.basic.birthDate': 'Fecha de Nacimiento (opcional)',
    'reg.basic.country': 'País',
    'reg.basic.city': 'Ciudad',
    'reg.basic.countryHint': 'Selecciona tu país',
    'reg.basic.cityHint': 'Escribe tu ciudad',
    'nav.home': 'Inicio',
    'nav.test': 'Test',
    'nav.code': 'Código',
    'nav.wines': 'Vinos',
    'nav.profile': 'Perfil',
    'nav.login': 'Entrar',
    'nav.ai': 'aiRIM',
    'native.appName': 'Matchrim',
    'native.tagline': 'Tu mesa, tu carta, tu vino.',
  },
  EN: {
    'common.back': 'Back',
    'common.continue': 'Continue',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.language': 'Language',
    'auth.title': 'Welcome',
    'auth.subtitle': 'Sign in or create an account to save your results',
    'auth.login': 'Sign In',
    'auth.register': 'Sign Up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.signIn': 'Sign In',
    'auth.signingIn': 'Signing in...',
    'auth.createAccount': 'Create Full Account',
    'auth.forgotPassword': 'Forgot your password?',
    'auth.tagline': 'Discover your perfect wine profile',
    'auth.signupHint': 'Create your account and discover your personalised wine profile',
    'auth.signupNote': 'Registration includes wine preferences, flavours and tailored experiences',
    'recover.title': 'Recover password',
    'recover.subtitle': 'We will email you a link to set a new password.',
    'recover.send': 'Send link',
    'recover.sending': 'Sending...',
    'recover.sent': 'If the email exists, you will receive a link shortly.',
    'recover.backToLogin': 'Back to sign in',
    'reset.title': 'Set a new password',
    'reset.subtitle': 'Type a new password to access your account.',
    'reset.newPassword': 'New password',
    'reset.update': 'Update password',
    'reset.updating': 'Updating...',
    'reset.success': 'Password updated. Redirecting...',
    'reset.invalidLink': 'This link is invalid or expired. Request a new one.',
    'reg.basic.firstName': 'First name',
    'reg.basic.lastName': 'Last name',
    'reg.basic.phone': 'Phone',
    'reg.basic.preferredLanguage': 'Preferred language',
    'reg.basic.location': 'Location',
    'reg.basic.birthDate': 'Date of birth (optional)',
    'reg.basic.country': 'Country',
    'reg.basic.city': 'City',
    'reg.basic.countryHint': 'Select your country',
    'reg.basic.cityHint': 'Type your city',
    'nav.home': 'Home',
    'nav.test': 'Quiz',
    'nav.code': 'Code',
    'nav.wines': 'Wines',
    'nav.profile': 'Profile',
    'nav.login': 'Sign in',
    'nav.ai': 'aiRIM',
    'native.appName': 'Matchrim',
    'native.tagline': 'Your table, your menu, your wine.',
  },
  FR: {
    'common.back': 'Retour',
    'common.continue': 'Continuer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.language': 'Langue',
    'auth.title': 'Bienvenue',
    'auth.subtitle': 'Connectez-vous ou créez un compte pour sauvegarder vos résultats',
    'auth.login': 'Se connecter',
    'auth.register': "S'inscrire",
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.signIn': 'Se connecter',
    'auth.signingIn': 'Connexion...',
    'auth.createAccount': 'Créer un compte complet',
    'auth.forgotPassword': 'Mot de passe oublié ?',
    'auth.tagline': 'Découvrez votre profil de vin idéal',
    'auth.signupHint': 'Créez votre compte et découvrez votre profil de vin personnalisé',
    'auth.signupNote': "L'inscription inclut vos préférences de vin, saveurs et expériences",
    'recover.title': 'Récupérer le mot de passe',
    'recover.subtitle': 'Nous vous enverrons un lien pour définir un nouveau mot de passe.',
    'recover.send': 'Envoyer le lien',
    'recover.sending': 'Envoi...',
    'recover.sent': 'Si l’email existe, vous recevrez un lien sous peu.',
    'recover.backToLogin': 'Retour à la connexion',
    'reset.title': 'Définir un nouveau mot de passe',
    'reset.subtitle': 'Saisissez un nouveau mot de passe pour accéder à votre compte.',
    'reset.newPassword': 'Nouveau mot de passe',
    'reset.update': 'Mettre à jour',
    'reset.updating': 'Mise à jour...',
    'reset.success': 'Mot de passe mis à jour. Redirection...',
    'reset.invalidLink': 'Lien invalide ou expiré. Demandez-en un nouveau.',
    'reg.basic.firstName': 'Prénom',
    'reg.basic.lastName': 'Nom',
    'reg.basic.phone': 'Téléphone',
    'reg.basic.preferredLanguage': 'Langue préférée',
    'reg.basic.location': 'Localisation',
    'reg.basic.birthDate': 'Date de naissance (optionnel)',
    'reg.basic.country': 'Pays',
    'reg.basic.city': 'Ville',
    'reg.basic.countryHint': 'Sélectionnez votre pays',
    'reg.basic.cityHint': 'Saisissez votre ville',
    'nav.home': 'Accueil',
    'nav.test': 'Quiz',
    'nav.code': 'Code',
    'nav.wines': 'Vins',
    'nav.profile': 'Profil',
    'nav.login': 'Connexion',
    'nav.ai': 'aiRIM',
    'native.appName': 'Matchrim',
    'native.tagline': 'Votre table, votre carte, votre vin.',
  },
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const STORAGE_KEY = 'matchrim.locale';

const detectInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return 'ES';
  const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
  if (stored && (stored === 'ES' || stored === 'EN' || stored === 'FR')) return stored;
  return 'ES';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // ignore quota / privacy mode
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale.toLowerCase();
  }, [locale]);

  const t = useCallback(
    (key: string) => dictionaries[locale][key] ?? dictionaries.ES[key] ?? key,
    [locale]
  );

  const value = useMemo<I18nContextValue>(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so legacy code paths keep working without provider.
    return {
      locale: 'ES',
      setLocale: () => {},
      t: (key: string) => dictionaries.ES[key] ?? key,
    };
  }
  return ctx;
}

export const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: 'ES', label: 'Español' },
  { value: 'EN', label: 'English' },
  { value: 'FR', label: 'Français' },
];
