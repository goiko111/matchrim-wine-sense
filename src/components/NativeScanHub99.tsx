import { useEffect, useLayoutEffect, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Utensils, type LucideIcon } from 'lucide-react';
import type { ScanMode, scanOptions } from '@/components/wine-import/ScanHub';
import { trackAppEvent } from '@/lib/analytics';
import { getScanHistory, SCAN_HISTORY_UPDATED_EVENT } from '@/utils/scanHistory';

interface Props {
  ownerId: string | null;
  options: typeof scanOptions;
  onSelectMode: (mode: ScanMode) => void;
  onOpenRestaurant: () => void;
  onOpenRecent: (route: string) => void;
}

const rowClass = 'matchrim-pressable grid min-h-[44px] w-full min-w-0 grid-cols-[44px_minmax(0,1fr)_20px] items-center gap-x-[12px] gap-y-[8px] py-[20px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900';
const textClass = 'min-w-0 [html.matchrim-accessibility-text_&]:col-span-3 [html.matchrim-accessibility-text_&]:col-start-1 [html.matchrim-accessibility-text_&]:row-start-2';

const Entry = ({ title, subtitle, label, icon: Icon, tone, onClick }: {
  title: string; subtitle?: string; label?: string; icon: LucideIcon; tone: string; onClick: () => void;
}) => (
  <button type="button" className={rowClass} aria-label={label} onClick={onClick}>
    <span className={`flex h-[44px] w-[44px] items-center justify-center rounded-md ${tone}`}>
      <Icon className="h-[22px] w-[22px]" aria-hidden="true" focusable="false" />
    </span>
    <span className={textClass}>
      <span className="block text-base font-semibold leading-6">{title}</span>
      {subtitle && <span className="mt-[4px] block text-sm leading-5 text-stone-500">{subtitle}</span>}
    </span>
    <ChevronRight className="col-start-3 row-start-1 h-[20px] w-[20px] text-stone-400" aria-hidden="true" focusable="false" />
  </button>
);

export const NativeScanHub99 = ({ ownerId, options, onSelectMode, onOpenRestaurant, onOpenRecent }: Props) => {
  const [recent, setRecent] = useState(() => getScanHistory(ownerId));

  useEffect(() => {
    trackAppEvent('scan_hub_opened', { userId: ownerId ?? undefined });
  }, [ownerId]);

  useLayoutEffect(() => {
    const refresh = () => setRecent(getScanHistory(ownerId));
    refresh();
    window.addEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(SCAN_HISTORY_UPDATED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [ownerId]);

  const bottles = options.find(option => option.id === 'label');
  const wineMenu = options.find(option => option.id === 'wine-menu');
  const more = options.filter(option => option.id !== 'label' && option.id !== 'wine-menu');

  return <div className="min-w-0 [overflow-wrap:anywhere]" data-testid="native-scan-hub99">
    <header className="mb-[24px]">
      <h1 className="text-2xl font-bold leading-tight">Escanear</h1>
    </header>

    <div className="divide-y divide-stone-200 border-y border-stone-200" data-testid="native-scan-primary99">
      {bottles && <Entry title="Botellas" subtitle={`${bottles.title} · Una o varias`}
        label={`${bottles.title} · Botellas · Una o varias`} icon={bottles.icon} tone="bg-red-50 text-red-900"
        onClick={() => onSelectMode(bottles.id)} />}
      {wineMenu && <Entry title={wineMenu.title} subtitle="Carta impresa o pizarra" icon={wineMenu.icon}
        tone="bg-emerald-50 text-emerald-800" onClick={() => onSelectMode(wineMenu.id)} />}
      <Entry title="Comida y vino" subtitle="Cartas completas, fotos, PDF y enlaces"
        label="Comida y vinos del restaurante · Comida y vino" icon={Utensils} tone="bg-stone-100 text-stone-700"
        onClick={onOpenRestaurant} />
    </div>

    <details className="group mt-[12px] border-b border-stone-200" data-testid="native-scan-more99">
      <summary aria-label="Más" className="matchrim-pressable flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-[12px] py-[12px] text-sm font-semibold text-stone-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="min-w-0">Más</span>
        <ChevronDown className="h-[20px] w-[20px] shrink-0 group-open:rotate-180" aria-hidden="true" focusable="false" />
      </summary>
      <div className="divide-y divide-stone-200">
        {more.map(option => <Entry key={option.id} title={option.title} icon={option.icon}
          tone="bg-stone-100 text-stone-700" onClick={() => onSelectMode(option.id)} />)}
      </div>
    </details>

    {recent.length > 0 && <section className="mt-[28px]" aria-labelledby="native-scan-recent99-title">
      <h2 id="native-scan-recent99-title" className="mb-[8px] text-base font-semibold">Últimos escaneos</h2>
      <ul className="divide-y divide-stone-200 border-y border-stone-200">
        {recent.slice(0, 5).map(item => <li key={item.id} className="min-w-0 py-[4px]">
          <button type="button" onClick={() => onOpenRecent(item.route)}
            className="matchrim-pressable flex min-h-[44px] w-full min-w-0 items-center gap-[12px] py-[12px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">{item.title}</span>
              {item.subtitle && <span className="mt-[4px] block text-xs text-stone-500">{item.subtitle}</span>}
            </span>
            <ChevronRight className="h-[20px] w-[20px] shrink-0 text-stone-400" aria-hidden="true" focusable="false" />
          </button>
          {item.externalUrl && <a href={item.externalUrl} target="_blank" rel="noopener noreferrer"
            className="matchrim-pressable flex min-h-[44px] min-w-[44px] items-center gap-[8px] py-[8px] text-sm font-semibold text-red-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-900">
            <ExternalLink className="h-[18px] w-[18px] shrink-0" aria-hidden="true" focusable="false" />
            <span className="min-w-0">{item.actionLabel || 'Ver ficha'}</span>
          </a>}
        </li>)}
      </ul>
    </section>}
  </div>;
};
