
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { buildRegistrationRedirectPath, getSafeRedirectPath } from '@/utils/navigation';
import { useI18n } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { peekPendingSave160, settlePendingSave160 } from '@/utils/pendingSave160';
import { savePending160 } from '@/components/NativeSaveChoice142';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn } = useAuth();
  const { t } = useI18n();
  const isNative = Capacitor.isNativePlatform();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));

  useEffect(() => {
    document.title = 'Matchrim | Inicia sesión';
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!user) return;
    // 160: a wine chosen before signing in is saved first, so the list it lands on already has it.
    let live = true;
    void settlePendingSave160(user.id, savePending160).then(done => {
      if (done) toast.success(`«${done.wine.name}» guardado en tus vinos`);
      if (live) navigate(redirectPath, { replace: true });
    });
    return () => { live = false; };
  }, [user, navigate, redirectPath]);
  const [pending160] = useState(() => Capacitor.isNativePlatform() ? peekPendingSave160() : null);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (!error && !(isNative && peekPendingSave160())) {
      // 135: replace, so Back from the destination does not land on /auth and bounce forward again.
      // 160: with a wine waiting to be saved, the effect above saves it and then leaves.
      navigate(redirectPath, isNative ? { replace: true } : undefined);
    }
    
    setIsLoading(false);
  };

  const handleRegisterRedirect = () => {
    navigate(buildRegistrationRedirectPath(redirectPath));
  };

  return (
    <div className={isNative ? 'matchrim-app-shell matchrim-native-auth min-h-screen px-[calc(1rem+var(--matchrim-safe-left))] pb-[calc(2rem+var(--matchrim-safe-bottom))] pt-[calc(1rem+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4'}>
      <div className={isNative ? 'mx-auto w-full min-w-0 max-w-md' : 'w-full max-w-md'}>
        <div className={isNative ? 'mb-4 flex min-w-0 flex-wrap items-center justify-between gap-[8px]' : 'flex items-center justify-between mb-4'}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/');
              }
            }}
            className={isNative ? 'h-auto min-h-[44px] min-w-[44px] gap-1 whitespace-normal px-[12px] py-[8px] text-red-900' : 'gap-1 text-red-900'}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <LanguageSwitcher className={isNative ? 'h-auto min-h-[44px] min-w-[44px]' : undefined} />
        </div>
        {/* 162 (owner's video of the 159: «a la página de Bienvenido le falta el diseño nuevo»): on the iPhone the
            access screen now looks like the rest of the app and says what the account is for before asking for it. */}
        {isNative ? <div className="mb-5 mt-4 text-left" data-testid="auth-head162">
          <div className="flex items-center gap-3">
            <img src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png" alt="" aria-hidden="true" className="h-11 w-11" />
            <h1 className="text-3xl font-bold leading-9 text-stone-950">Matchrim</h1>
          </div>
          {!pending160 && <>
            <p className="mt-4 text-xl font-bold leading-7 text-stone-950">Tu gusto, guardado contigo</p>
            <ul className="mt-3 space-y-2 text-base leading-6 text-stone-700">
              {['Tus vinos y tus valoraciones no se pierden', 'Tu perfil te sigue si cambias de móvil', 'Cuanto más valoras, mejor acierta tu nota'].map(line => <li key={line} className="flex items-start gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />{line}</li>)}
            </ul>
          </>}
        </div> : <div className="text-center mb-4">
          <img
            src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
            alt="Logo Matchrim"
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-900">Matchrim</h1>
          <p className="text-red-600">{t('auth.tagline')}</p>
        </div>}

        {pending160 && <div role="status" data-testid="auth-why160" className="mb-5 rounded-2xl bg-red-950 p-4 text-white">
          <p className="text-base font-bold leading-6 [overflow-wrap:anywhere]">Para guardar «{pending160.wine.name}» necesitas una cuenta</p>
          <p className="mt-1 text-sm leading-6 text-white/85">Así tus vinos, tus valoraciones y tu perfil se quedan contigo aunque cambies de móvil. Si ya tienes cuenta, inicia sesión y lo guardamos solo. Si no, créala: es gratis y tarda un minuto.</p>
        </div>}
        <Card className={isNative ? 'rounded-3xl border-0 bg-white p-4 shadow-sm ring-1 ring-stone-200 [&_input]:min-h-12 [&_input]:rounded-xl [&_input]:text-base' : undefined}>
          <CardHeader className={isNative ? 'sr-only' : undefined}>
            <CardTitle className="text-center text-red-900">{t('auth.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent className={isNative ? 'min-w-0 p-0' : undefined}>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className={isNative ? 'mb-4 grid h-auto w-full min-w-0 grid-cols-2 gap-[4px] rounded-full bg-stone-100 p-[4px] [&>button]:rounded-full [.matchrim-accessibility-text_&]:grid-cols-1 [.matchrim-accessibility-text_&]:md:grid-cols-2' : 'grid w-full grid-cols-2'}>
                <TabsTrigger value="login" className={isNative ? 'h-auto min-h-[44px] min-w-0 whitespace-normal break-words px-[8px] py-[8px]' : undefined}>{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="signup" className={isNative ? 'h-auto min-h-[44px] min-w-0 whitespace-normal break-words px-[8px] py-[8px]' : undefined}>{t('auth.register')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      aria-label={t('auth.email')}
                      autoComplete="email"
                      placeholder={t('auth.email')}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      aria-label={t('auth.password')}
                      autoComplete="current-password"
                      placeholder={t('auth.password')}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className={isNative ? 'min-w-0 pr-[48px]' : 'pr-10'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className={isNative ? 'absolute right-0 top-1/2 flex h-[44px] w-[44px] -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground' : 'absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground'}
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className={isNative ? 'h-auto min-h-12 w-full min-w-0 whitespace-normal rounded-full bg-red-900 px-[12px] py-[10px] text-base hover:bg-red-950' : 'w-full bg-red-700 hover:bg-red-800'}
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                  <div className="text-center">
                    <Link to={isNative && searchParams.get('redirect') ? `/forgot-password?redirect=${encodeURIComponent(redirectPath)}` : '/forgot-password'} replace={isNative} className={isNative ? 'inline-flex min-h-[44px] min-w-[44px] max-w-full items-center justify-center py-[10px] text-sm text-red-800 hover:underline' : 'text-xs text-red-800 hover:underline'}>
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <p className={isNative ? 'text-left text-base leading-6 text-stone-700' : 'text-center text-sm text-gray-600'}>
                    {isNative ? 'Crear la cuenta es gratis y tarda un minuto: correo, contraseña y listo.' : t('auth.signupHint')}
                  </p>
                  <Button
                    onClick={handleRegisterRedirect}
                    className={isNative ? 'h-auto min-h-12 w-full min-w-0 whitespace-normal rounded-full bg-red-900 px-[12px] py-[10px] text-base hover:bg-red-950' : 'w-full bg-red-700 hover:bg-red-800'}
                  >
                    {t('auth.createAccount')}
                  </Button>
                  <p className="text-xs text-center text-gray-500">
                    {t('auth.signupNote')}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <div className={isNative ? 'mt-5 flex min-w-0 flex-wrap items-center justify-center gap-[8px] text-sm text-red-900' : 'mt-5 flex items-center justify-center gap-4 text-xs text-red-900'}>
          <Link to="/privacy" className={isNative ? 'inline-flex min-h-[44px] min-w-[44px] items-center py-[10px] hover:underline' : 'hover:underline'}>
            Privacidad
          </Link>
          <span className="text-red-300">|</span>
          <Link to="/terms" className={isNative ? 'inline-flex min-h-[44px] min-w-[44px] items-center py-[10px] hover:underline' : 'hover:underline'}>
            Términos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
