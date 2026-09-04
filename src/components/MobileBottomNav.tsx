import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Compass, Home, ScanLine, UserRound, Wine, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { useI18n } from '@/i18n';

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

  useEffect(() => {
    const bodyClass = isNative ? 'has-native-app-nav' : 'has-mobile-app-nav';
    document.body.classList.add(bodyClass);

    return () => {
      document.body.classList.remove(bodyClass);
    };
  }, [isNative]);

  const navLinks: BottomNavLink[] = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/wine-styles', label: 'Descubrir', icon: Compass, activePaths: ['/wine-styles', '/wines/'] },
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

  return (
    <nav
      aria-label="Navegación principal"
      className={`matchrim-tab-bar fixed inset-x-0 bottom-0 z-50 border-t border-slate-200/90 bg-white/95 px-2 pb-[calc(0.35rem+var(--matchrim-safe-bottom))] pt-1.5 backdrop-blur-xl ${isNative ? '' : 'md:hidden'}`}
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 gap-1">
        {navLinks.map((link) => {
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
