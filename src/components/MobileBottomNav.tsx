import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { BrainCircuit, Home, ScanLine, UserRound, Wine, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { useI18n } from '@/i18n';
import AiRimMark from '@/components/AiRimMark';

type BottomNavLink = {
  path: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  activePaths?: string[];
};

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const bodyClass = isNative ? 'has-native-app-nav' : 'has-mobile-app-nav';
    document.body.classList.add(bodyClass);
    const nav = navRef.current;
    if (!nav) return;
    // Reserve the actual bar height, including wrapped labels and safe-area padding.
    const updateHeight = () => document.body.style.setProperty(
      '--matchrim-bottom-nav-height', `${nav.getBoundingClientRect().height}px`,
    );
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    updateHeight();

    return () => {
      observer.disconnect();
      document.body.classList.remove(bodyClass);
      document.body.style.removeProperty('--matchrim-bottom-nav-height');
    };
  }, [isNative]);

  const webNavLinks: BottomNavLink[] = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/inteligencia-liquida', label: 'aiRIM', icon: BrainCircuit },
    { path: '/escanear', label: 'Escanear', icon: ScanLine },
    { path: '/my-wines', label: 'Bodega', icon: Wine, requiresAuth: true },
    {
      path: '/profile',
      label: 'Perfil',
      icon: UserRound,
      requiresAuth: true,
      activePaths: ['/profile', '/matchrim', '/auth', '/registration'],
    },
  ];

  const isActivePath = (link: BottomNavLink) => {
    const paths = [link.path, ...(link.activePaths || [])];
    return paths.some((path) => (
      location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
    ));
  };

  const getLinkTarget = (link: BottomNavLink) => {
    if (!user && link.requiresAuth) return buildAuthRedirectPath(link.path);
    return link.path;
  };

  if (isNative) {
    return (
      <nav
        ref={navRef}
        aria-label="Navegación principal"
        className="matchrim-tab-bar matchrim-native-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 pl-[calc(0.5rem+var(--matchrim-safe-left))] pr-[calc(0.5rem+var(--matchrim-safe-right))] pb-[calc(0.35rem+var(--matchrim-safe-bottom))] pt-1.5 backdrop-blur-xl"
      >
        <div className="mx-auto grid min-h-16 max-w-lg grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-0.5">
          {webNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isActivePath(link);
            const isScan = link.path === '/escanear';
            return (
              <Link
                key={`${link.path}-${link.label}`}
                to={getLinkTarget(link)}
                aria-label={link.label}
                aria-current={isActive ? 'page' : undefined}
                className={`matchrim-pressable relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 text-[0.6875rem] font-semibold leading-tight ${isScan ? 'matchrim-native-scan-tab text-slate-700' : isActive ? 'text-red-900' : 'text-slate-500'}`}
              >
                {isScan ? (
                  <span className={`matchrim-native-scan-tab-icon flex aspect-square w-12 max-w-full shrink-0 items-center justify-center rounded-full border-4 border-white text-white shadow-[0_10px_26px_-10px_rgba(42,8,19,0.75)] ${isActive ? 'bg-red-900' : 'bg-slate-950'}`}>
                    <ScanLine className="h-5 w-5" aria-hidden="true" />
                  </span>
                ) : link.path === '/inteligencia-liquida' ? (
                  <AiRimMark className="h-[1.35rem] w-[1.35rem]" iconClassName="h-[1.35rem] w-[1.35rem]" />
                ) : (
                  <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
                )}
                <span className="max-w-full whitespace-normal text-center [overflow-wrap:anywhere]" aria-hidden="true">{link.label}</span>
                {isActive && !isScan && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-red-800" aria-hidden="true" />}
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav
      ref={navRef}
      aria-label="Navegación principal"
      className={`matchrim-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pb-[calc(0.35rem+var(--matchrim-safe-bottom))] pt-1.5 backdrop-blur-xl ${isNative ? '' : 'md:hidden'}`}
    >
      <div className="mx-auto grid min-h-16 max-w-md grid-cols-5 gap-1">
        {webNavLinks.map((link) => {
          const Icon = link.icon;
          const isActive = isActivePath(link);
          const to = getLinkTarget(link);
          const isScan = link.path === '/escanear';

          return (
            <Link
              key={`${link.path}-${link.label}`}
              to={to}
              aria-label={link.label}
              aria-current={isActive ? 'page' : undefined}
              title={link.label}
              className={`matchrim-pressable relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[10px] font-semibold leading-none ${
                isScan
                  ? 'text-red-950'
                  : isActive
                    ? 'text-red-900'
                    : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {isScan ? (
                <span className={`flex h-11 w-11 items-center justify-center rounded-full shadow-[0_8px_22px_-10px_rgba(72,6,25,0.9)] ${
                  isActive ? 'bg-red-900 text-white' : 'bg-slate-950 text-white'
                }`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              ) : (
                <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={isActive ? 2.3 : 1.9} aria-hidden="true" />
              )}
              <span aria-hidden="true">{link.label}</span>
              {isActive && !isScan && <span className="absolute top-0 h-0.5 w-5 rounded-full bg-red-800" aria-hidden="true" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
