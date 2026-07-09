import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ChevronRight,
  GlassWater,
  LogIn,
  MapPin,
  ScanLine,
  ShoppingBag,
  Sparkles,
  User,
  Wine,
} from 'lucide-react';
import AppNav from '@/components/AppNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildAuthRedirectPath } from '@/utils/navigation';

interface NativeAppHomeProps {
  hasQuizResults: boolean;
}

const NativeAppHome = ({ hasQuizResults }: NativeAppHomeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const primaryAction = user && hasQuizResults
    ? { label: 'Usar mi código', path: '/usar-matchrim', icon: ScanLine }
    : { label: 'Crear mi Matchrim', path: '/matchrim', icon: Sparkles };

  const PrimaryIcon = primaryAction.icon;

  const quickActions = [
    {
      label: 'Código',
      detail: 'Filtra una carta Winerim',
      icon: ScanLine,
      action: () => navigate('/usar-matchrim'),
    },
    {
      label: 'Escanear',
      detail: 'Carta sin Winerim',
      icon: GlassWater,
      action: () => navigate('/usar-matchrim?mode=scanner'),
    },
    {
      label: 'Encontrar vino',
      detail: 'Presupuesto, ocasión o región nueva',
      icon: ShoppingBag,
      action: () => navigate('/escanear/encontrar-vino'),
    },
    {
      label: 'Mis vinos',
      detail: user ? 'Guarda y puntúa' : 'Entra para guardar',
      icon: BookOpen,
      action: () => navigate(user ? '/my-wines' : buildAuthRedirectPath('/my-wines')),
    },
  ];

  const steps = [
    {
      title: 'Crea tu código',
      detail: 'Un perfil sensorial con nombre de uva y carácter de vino.',
      icon: User,
    },
    {
      title: 'Filtra la carta',
      detail: 'En restaurantes Winerim, tu código acota la carta al instante.',
      icon: ScanLine,
    },
    {
      title: 'Aprende contigo',
      detail: 'Tus vinos guardados afinan el perfil según lo que puntúas.',
      icon: Wine,
    },
  ];

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      {user ? (
        <AppNav />
      ) : (
        <header className="sticky top-0 z-40 border-b border-red-100 bg-white/95 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-3"
            >
              <img
                src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
                alt="Logo Matchrim"
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-red-950">Matchrim</span>
            </button>
            <Button
              onClick={() => navigate(buildAuthRedirectPath('/'))}
              variant="outline"
              size="sm"
              className="gap-2 border-red-200 text-red-900"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </div>
        </header>
      )}

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col gap-5 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
        <section className="rounded-lg bg-red-950 px-5 py-6 text-white shadow-elegant">
          <Badge className="mb-5 bg-white/12 text-white hover:bg-white/12">
            Matchrim
          </Badge>
          <h1 className="text-3xl font-bold leading-tight">
            Tu mesa, tu carta, tu vino.
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/78">
            Usa tu código sensorial para encontrar los vinos que encajan contigo en restaurantes Winerim o en cartas escaneadas.
          </p>

          <div className="mt-6 rounded-md border border-white/15 bg-white/8 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/55">Estado Matchrim</p>
                <p className="mt-1 text-lg font-semibold">
                  {hasQuizResults ? 'Código listo' : 'Código pendiente'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white text-red-950">
                {hasQuizResults ? <Wine className="h-6 w-6" /> : <User className="h-6 w-6" />}
              </div>
            </div>
          </div>

          <Button
            onClick={() => navigate(primaryAction.path)}
            className="mt-5 min-h-12 w-full gap-2 bg-amber-400 text-slate-950 hover:bg-amber-300"
          >
            <PrimaryIcon className="h-5 w-5" />
            {primaryAction.label}
          </Button>
        </section>

        <section className="grid gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex min-h-16 items-center gap-3 rounded-lg border border-stone-200 bg-white px-4 shadow-sm"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-stone-100 text-red-900">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-amber-700">0{index + 1}</span>
                    <h2 className="font-semibold text-slate-950">{step.title}</h2>
                  </div>
                  <p className="mt-0.5 text-sm leading-5 text-slate-500">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                type="button"
                onClick={action.action}
                className="flex min-h-20 items-center gap-4 rounded-lg border border-stone-200 bg-white px-4 text-left shadow-sm transition-colors hover:border-red-200 hover:bg-red-50"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-red-50 text-red-900">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950">{action.label}</span>
                  <span className="mt-1 block text-sm text-slate-500">{action.detail}</span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </button>
            );
          })}
        </section>

        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-950">Restaurante sin Winerim</h2>
              <p className="mt-1 text-sm leading-6 text-amber-900">
                Indica dónde estás, escanea la carta y recibe una recomendación adaptada a tu perfil.
              </p>
              <Button
                onClick={() => navigate('/usar-matchrim?mode=scanner')}
                variant="outline"
                size="sm"
                className="mt-3 gap-2 border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              >
                <ScanLine className="h-4 w-4" />
                Escanear carta
              </Button>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-center gap-4 pb-2 text-xs text-slate-500">
          <button type="button" onClick={() => navigate('/privacy')} className="hover:text-red-900">
            Privacidad
          </button>
          <span className="text-slate-300">|</span>
          <button type="button" onClick={() => navigate('/terms')} className="hover:text-red-900">
            Términos
          </button>
        </footer>
      </main>
      {!user && <MobileBottomNav />}
    </div>
  );
};

export default NativeAppHome;
