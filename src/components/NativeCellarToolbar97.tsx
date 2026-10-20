import type { ReactNode } from 'react';
import { Plus, ScanLine, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export type NativeCellarSection97 = 'collection' | 'wishlist' | 'tasted' | 'favorites' | 'rejected';

interface NativeCellarToolbar97Props {
  section: NativeCellarSection97;
  counts: Record<NativeCellarSection97, number>;
  onSectionChange: (section: NativeCellarSection97) => void;
  onScanLabel: () => void;
  onScanMenu: () => void;
  onAddManually: () => void;
  search: ReactNode;
}

const sections: ReadonlyArray<[NativeCellarSection97, string]> = [
  ['collection', 'En bodega'], ['wishlist', 'Por probar'], ['tasted', 'Probados'],
  ['favorites', 'Favoritos'], ['rejected', 'No repetir'],
];

export const NativeCellarToolbar97 = ({ section, counts, onSectionChange, onScanLabel,
  onScanMenu, onAddManually, search }: NativeCellarToolbar97Props) => (
  <header className="min-w-0 space-y-2" data-testid="native-cellar-toolbar97">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <h1 className="min-w-0 max-w-full text-2xl font-bold text-slate-950 [overflow-wrap:normal]">Bodega</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon" className="ml-auto h-11 w-11 shrink-0 bg-red-900 text-white hover:bg-red-800"
            aria-label="Añadir vino" title="Añadir vino">
            <Plus className="h-5 w-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]">
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={onScanLabel}>
            <ScanLine className="h-4 w-4" aria-hidden="true" /> Escanear etiqueta
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={onScanMenu}>
            <ScanLine className="h-4 w-4" aria-hidden="true" /> Escanear carta
          </DropdownMenuItem>
          <DropdownMenuItem className="min-h-11 gap-2" onSelect={onAddManually}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Añadir manualmente
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    <select value={section} aria-label="Sección de tus vinos" onChange={event => {
      const value = event.target.value;
      if (sections.some(([key]) => key === value)) onSectionChange(value as NativeCellarSection97);
    }} className="min-h-11 w-full min-w-0 max-w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-base text-stone-900">
      {sections.map(([key, label]) => <option key={key} value={key}>{label} ({counts[key]})</option>)}
    </select>
    <details className="min-w-0 border-b border-stone-200 pb-1" data-testid="native-cellar-catalog97">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium text-stone-700">
        <Search className="h-4 w-4 shrink-0" aria-hidden="true" /> Buscar en el catálogo
      </summary>
      <div className="min-w-0 pb-3" role="search" aria-label="Añadir un vino del catálogo">{search}</div>
    </details>
  </header>
);
