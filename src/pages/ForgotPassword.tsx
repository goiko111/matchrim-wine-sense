import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { buildPasswordResetRedirect } from '@/utils/authRedirect';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { ArrowLeft } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const isNative = Capacitor.isNativePlatform();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.title = 'Matchrim | Recuperar contraseña';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildPasswordResetRedirect(),
    });
    setLoading(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setSent(true);
  };

  return (
    <div className={isNative ? 'matchrim-app-shell min-h-screen px-[calc(16px+var(--matchrim-safe-left))] pb-[calc(24px+var(--matchrim-safe-bottom))] pt-[calc(16px+var(--matchrim-safe-top))]' : 'min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4'}>
      <div className={isNative ? 'mx-auto w-full min-w-0 max-w-md' : 'w-full max-w-md'}>
        <div className={isNative ? 'mb-4 flex min-w-0 flex-wrap justify-between gap-[8px]' : 'flex justify-between mb-2'}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className={isNative ? 'h-auto min-h-[44px] min-w-[44px] gap-1 whitespace-normal px-[12px] py-[8px] text-red-900' : 'gap-1 text-red-900'}>
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <LanguageSwitcher className={isNative ? 'h-auto min-h-[44px] min-w-[44px]' : undefined} />
        </div>
        <Card className={isNative ? 'min-w-0 border-0 bg-transparent shadow-none' : undefined}>
          <CardHeader className={isNative ? 'min-w-0 p-0 pb-[16px] [overflow-wrap:anywhere]' : undefined}>
            <CardTitle className="text-center text-red-900">{t('recover.title')}</CardTitle>
            <CardDescription className="text-center">{t('recover.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className={isNative ? 'min-w-0 p-0' : undefined}>
            {sent ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-gray-700">{t('recover.sent')}</p>
                <Link to="/auth" className={isNative ? 'inline-flex min-h-[44px] min-w-[44px] max-w-full items-center justify-center py-[10px] text-sm text-red-800 underline' : 'text-sm text-red-800 underline'}>
                  {t('recover.backToLogin')}
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  type="email"
                  aria-label={isNative ? t('auth.email') : undefined}
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Button type="submit" disabled={loading} className={isNative ? 'h-auto min-h-[44px] w-full min-w-0 whitespace-normal bg-red-700 px-[12px] py-[10px] hover:bg-red-800' : 'w-full bg-red-700 hover:bg-red-800'}>
                  {loading ? t('recover.sending') : t('recover.send')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
