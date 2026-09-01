import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronRight,
  Compass,
  GlassWater,
  ListChecks,
  LogIn,
  ScanLine,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  User,
} from 'lucide-react';
import AppNav from '@/components/AppNav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import MobileBottomNav from '@/components/MobileBottomNav';
import { buildAuthRedirectPath } from '@/utils/navigation';
import heroWine from '@/assets/hero-tinto-versatil.jpg';

interface NativeAppHomeProps {
  hasQuizResults: boolean;
  matchrimCode?: string;
  loadingCode?: boolean;
}

const decisionTiles = [
  {
    label: 'Escanear carta',
    detail: 'Ordena una carta, pizarra o PDF por afinidad, precio y confianza.',
    path: '/escanear/carta-vinos',
    icon: ScanLine,
    primary: true,
  },
  {
    label: 'Escanear etiquetas',
    detail: 'Detecta varias botellas sin fusionarlas en una sola ficha.',
    path: '/escanear/etiqueta',
    icon: Camera,
  },
  {
    label: 'Comparar 2–5',
    detail: 'Escanea un lote y decide entre opciones seguras, valor y aventura.',
    path: '/escanear/carta-vinos',
    icon: SlidersHorizontal,
  },
  {
    label: 'Mis vinos',
    detail: 'Guarda, puntúa y mejora tu perfil solo con datos consentidos.',
    path: '/my-wines',
    icon: BookOpen,
    requiresAuth: true,
  },
];

const trustSignals = [
  { label: 'Mesa completa', value: '2-N', icon: ListChecks },
  { label: 'Comparador', value: '2-5', icon: SlidersHorizontal },
  { label: 'Confianza visible', value: 'OCR', icon: ShieldCheck },
];

const aiRimNotes = [
  'Explica por qué un vino encaja sin cambiar el cálculo.',
  'Marca inferencias, datos visibles y preferencias aprendidas por separado.',
  'Se abstiene cuando la identidad no tiene respaldo suficiente.',
];

const NativeAppHome = ({ hasQuizResults, matchrimCode = '', loadingCode = false }: NativeAppHomeProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasCode = hasQuizResults && Boolean(matchrimCode);
  const primaryAction = hasQuizResults
    ? { label: 'Usar mi Matchrim', path: '/escanear/carta-vinos', icon: ScanLine }
    : { label: 'Crear mi Matchrim', path: '/matchrim', icon: Sparkles };
  const PrimaryIcon = primaryAction.icon;

  const getTileTarget = (path: string, requiresAuth?: boolean) => (
    !user && requiresAuth ? buildAuthRedirectPath(path) : path
  );

  return (
    <div className="matchrim-app-shell min-h-screen text-slate-950">
      {user ? (
        <AppNav />
      ) : (
        <header className="sticky top-0 z-40 border-b matchrim-hairline bg-white/95 px-4 pb-3 pt-[calc(0.75rem+var(--matchrim-safe-top))] backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="matchrim-pressable flex min-h-11 items-center gap-3 text-left"
            >
              <img
                src="/lovable-uploads/cf98d0b7-f33d-40fe-bd49-d139d0354da1.png"
                alt="Logo Matchrim"
                className="h-8 w-8"
              />
              <span className="text-lg font-bold text-slate-950">Matchrim</span>
            </button>
            <Button
              onClick={() => navigate(buildAuthRedirectPath('/'))}
              variant="outline"
              size="sm"
              className="matchrim-pressable min-h-11 gap-2 border-stone-300 bg-white text-slate-800"
            >
              <LogIn className="h-4 w-4" />
              Entrar
            </Button>
          </div>
        </header>
      )}

      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 pb-[calc(7rem+var(--matchrim-safe-bottom))] pt-5 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(22rem,0.95fr)] lg:gap-8 lg:pb-12 lg:pt-8">
        <section className="matchrim-ink-panel overflow-hidden rounded-lg shadow-elegant">
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_17rem] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex flex-col justify-between gap-4 p-4 sm:gap-8 sm:p-7">
              <div>
                <Badge className="mb-4 border-white/15 bg-white/10 text-white hover:bg-white/10 sm:mb-5">
                  Decisión en mesa
                </Badge>
                <h1 className="max-w-2xl text-[1.72rem] font-bold leading-tight tracking-normal text-white sm:text-5xl">
                  Elige vino desde la escena real, no desde una ficha suelta.
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-5 text-white/76 sm:mt-4 sm:text-base sm:leading-7">
                  Escanea una carta, una mesa o varias botellas. Matchrim separa identidad, confianza y afinidad para que puedas decidir o corregir sin perder contexto.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div className="rounded-md border border-white/12 bg-white/8 p-3 sm:p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                    {hasCode ? 'Mi código Matchrim' : 'Estado Matchrim'}
                  </p>
                  <p className="mt-1 min-h-7 break-words text-xl font-semibold leading-tight sm:min-h-8 sm:text-2xl">
                    {hasCode
                      ? matchrimCode
                      : loadingCode
                        ? 'Cargando código...'
                        : hasQuizResults
                          ? 'Código listo'
                          : 'Perfil pendiente'}
                  </p>
                  <p className="mt-2 text-sm leading-5 text-white/62">
                    {hasCode
                      ? 'Tu perfil es estable; las recomendaciones aprenden solo de lo que guardas y confirmas.'
                      : 'Crea el perfil una vez y úsalo después en cartas, etiquetas y comparaciones.'}
                  </p>
                </div>
                <Button
                  onClick={() => navigate(primaryAction.path)}
                  className="matchrim-pressable min-h-12 gap-2 bg-amber-400 px-5 font-semibold text-slate-950 hover:bg-amber-300"
                >
                  <PrimaryIcon className="h-5 w-5" />
                  {primaryAction.label}
                </Button>
              </div>
            </div>

            <div className="relative hidden min-h-44 overflow-hidden border-t border-white/10 sm:block sm:min-h-64 md:border-l md:border-t-0 lg:border-l-0 lg:border-t xl:border-l xl:border-t-0">
              <img
                src={heroWine}
                alt="Botella y copa de vino en una mesa"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/22 to-transparent" />
              <div className="absolute inset-x-3 bottom-3 rounded-md border border-white/12 bg-black/42 p-3 text-white backdrop-blur sm:inset-x-4 sm:bottom-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/55">Ranking vivo</p>
                    <p className="mt-1 font-semibold">3 opciones listas para comparar</p>
                  </div>
                  <span className="rounded-md bg-emerald-400 px-2 py-1 text-sm font-bold text-emerald-950">92%</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  {trustSignals.map((signal) => {
                    const Icon = signal.icon;
                    return (
                      <div key={signal.label} className="rounded-md bg-white/10 px-2 py-2">
                        <Icon className="mx-auto h-4 w-4 text-amber-200" />
                        <span className="mt-1 block font-semibold">{signal.value}</span>
                        <span className="block text-white/55">{signal.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section aria-label="Acciones principales" className="grid content-start gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            {decisionTiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => navigate(getTileTarget(tile.path, tile.requiresAuth))}
                  className={`matchrim-pressable matchrim-surface flex min-h-24 items-center gap-4 rounded-lg px-4 py-4 text-left ${
                    tile.primary ? 'ring-1 ring-red-900/12' : ''
                  }`}
                >
                  <span className={`matchrim-icon-tile flex h-12 w-12 shrink-0 items-center justify-center rounded-md ${
                    tile.primary ? 'bg-red-950 text-white' : ''
                  }`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-950">{tile.label}</span>
                    <span className="mt-1 block text-sm leading-5 matchrim-muted">{tile.detail}</span>
                  </span>
                  <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>

          <div className="matchrim-soft-surface rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="matchrim-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-md">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-950">aiRIM contextual</h2>
                <div className="mt-2 grid gap-2">
                  {aiRimNotes.map((note) => (
                    <div key={note} className="flex gap-2 text-sm leading-5 matchrim-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="matchrim-pressable mt-4 min-h-11 gap-2 bg-white"
                  onClick={() => navigate('/inteligencia-liquida')}
                >
                  <Sparkles className="h-4 w-4" />
                  Abrir aiRIM
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => navigate('/usar-matchrim')}
              className="matchrim-pressable matchrim-soft-surface flex min-h-20 items-center gap-3 rounded-lg p-4 text-left"
            >
              <GlassWater className="h-5 w-5 shrink-0 text-red-900" />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-950">Restaurante con Winerim</span>
                <span className="mt-1 block text-sm matchrim-muted">Filtra la carta con tu código.</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
            <button
              type="button"
              onClick={() => navigate(hasQuizResults ? '/profile' : '/matchrim')}
              className="matchrim-pressable matchrim-soft-surface flex min-h-20 items-center gap-3 rounded-lg p-4 text-left"
            >
              {hasQuizResults ? <Compass className="h-5 w-5 shrink-0 text-red-900" /> : <User className="h-5 w-5 shrink-0 text-red-900" />}
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-950">{hasQuizResults ? 'Revisar perfil' : 'Crear perfil'}</span>
                <span className="mt-1 block text-sm matchrim-muted">{hasQuizResults ? 'Radar, aprendizaje y datos guardados.' : 'Un minuto antes del primer escaneo.'}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        </section>
      </main>

      {!user && <MobileBottomNav />}
    </div>
  );
};

export default NativeAppHome;
