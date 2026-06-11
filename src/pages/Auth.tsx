
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { buildRegistrationRedirectPath, getSafeRedirectPath } from '@/utils/navigation';
import { useI18n } from '@/i18n';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, signIn } = useAuth();
  const { t } = useI18n();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const redirectPath = getSafeRedirectPath(searchParams.get('redirect'));

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(redirectPath, { replace: true });
    }
  }, [user, navigate, redirectPath]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(loginForm.email, loginForm.password);
    
    if (!error) {
      navigate(redirectPath);
    }
    
    setIsLoading(false);
  };

  const handleRegisterRedirect = () => {
    navigate(buildRegistrationRedirectPath(redirectPath));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-4 relative">
          <div className="absolute right-0 top-0">
            <LanguageSwitcher />
          </div>
          <img
            src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
            alt="Logo Winerim"
            className="h-16 w-16 mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold text-red-900">Winerim</h1>
          <p className="text-red-600">{t('auth.tagline')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-900">{t('auth.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('auth.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">{t('auth.login')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.register')}</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Input
                      type="email"
                      placeholder={t('auth.email')}
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('auth.password')}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-red-700 hover:bg-red-800"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                  </Button>
                  <div className="text-center">
                    <Link to="/forgot-password" className="text-xs text-red-800 hover:underline">
                      {t('auth.forgotPassword')}
                    </Link>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <div className="space-y-4">
                  <p className="text-center text-sm text-gray-600">
                    {t('auth.signupHint')}
                  </p>
                  <Button
                    onClick={handleRegisterRedirect}
                    className="w-full bg-red-700 hover:bg-red-800"
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
        <div className="mt-5 flex items-center justify-center gap-4 text-xs text-red-900">
          <Link to="/privacy" className="hover:underline">
            Privacidad
          </Link>
          <span className="text-red-300">|</span>
          <Link to="/terms" className="hover:underline">
            Términos
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Auth;
