import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { BookOpen, Home, ScanLine, Sparkles, User, Wine, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { buildAuthRedirectPath } from '@/utils/navigation';
import { useI18n } from '@/i18n';

type BottomNavLink = {
  path: string;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
};

const MobileBottomNav = () => {
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const isNative = Capacitor.isNativePlatform();
  const currentPath = `${location.pathname}${location.search}`;

  useEffect(() => {
    document.body.classList.add('has-mobile-app-nav');

    return () => {
      document.body.classList.remove('has-mobile-app-nav');
    };
  }, []);

  const commonLinks: BottomNavLink[] = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/matchrim', label: t('nav.test'), icon: Wine },
    { path: '/escanear', label: 'Escanear', icon: ScanLine },
  ];

  const nativeLinks: BottomNavLink[] = [
    ...commonLinks,
    { path: '/my-wines', label: t('nav.wines'), icon: BookOpen, requiresAuth: true },
    user
      ? { path: '/profile', label: t('nav.profile'), icon: User, requiresAuth: true }
      : { path: '/auth', label: t('nav.login'), icon: User },
  ];

  const webLinks: BottomNavLink[] = [
    ...commonLinks,
    { path: '/inteligencia-liquida', label: t('nav.ai'), icon: Sparkles },
    { path: '/my-wines', label: t('nav.wines'), icon: BookOpen, requiresAuth: true },
  ];

  const navLinks = isNative || user ? nativeLinks : webLinks;

  const isActivePath = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(`${path}/`));

  const getLinkTarget = (link: BottomNavLink) => {
    if (!user && link.path === '/auth') return buildAuthRedirectPath(currentPath);
    if (!user && link.requiresAuth) return buildAuthRedirectPath(link.path);
    return link.path;
  };

  return (
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-red-100 bg-white px-2 pb-[calc(0.5rem+var(--matchrim-safe-bottom))] pt-2 shadow-[0_-12px_30px_-20px_rgba(127,29,29,0.45)] md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = isActivePath(link.path);
          const to = getLinkTarget(link);

          return (
            <Link
              key={`${link.path}-${link.label}`}
              to={to}
              aria-label={link.label}
              aria-current={isActive ? 'page' : undefined}
              title={link.label}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-md px-1 text-[11px] font-semibold leading-none transition-colors ${
                isActive
                  ? 'bg-red-50 text-red-800'
                  : 'text-gray-600 hover:bg-red-50 hover:text-red-700'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span aria-hidden="true">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
