import { useState, type ReactNode } from 'react';
import { Camera, ChevronDown, MoreHorizontal, Plus, Search, Type } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { NativeCellarSection97 } from '@/components/NativeCellarToolbar97';

interface Props {
  section: NativeCellarSection97;
  counts: Record<NativeCellarSection97, number>;
  /** 136: while the cellar failed to load, zeros contradicted "tus datos no se han borrado"; counts are hidden. */
  countsUnknown?: boolean;
  onSectionChange: (section: NativeCellarSection97) => void;
  onScanLabel: () => void;
  onScanMenu: () => void;
  onAddManually: () => void;
  search: ReactNode;
}
const tabs = [['collection', 'En bodega'], ['wishlist', 'Por probar'], ['tasted', 'Probados']] as const;

export const NativeCellarToolbar98 = ({ section, counts, countsUnknown = false, onSectionChange, onScanLabel, onAddManually, search }: Props) => {
  const [searchOpen, setSearchOpen] = useState(false);
  return <header className="min-w-0 space-y-4" data-testid="native-cellar-toolbar98">
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
      <h1 className="min-w-0 text-2xl font-bold text-stone-950 [overflow-wrap:normal]">Mis vinos</h1>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" className="flex h-11 w-11 items-center justify-center" aria-label="Buscar en el catálogo" title="Buscar vino" aria-expanded={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search className="h-5 w-5" /></button>
        <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full bg-red-900 text-white" aria-label="Añadir vino" title="Añadir vino"><Plus className="h-5 w-5" /></button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11 gap-3" onSelect={onScanLabel}><Camera className="h-4 w-4" />Escanear</DropdownMenuItem><DropdownMenuItem className="min-h-11 gap-3" onSelect={() => setSearchOpen(true)}><Search className="h-4 w-4" />Buscar vino</DropdownMenuItem><DropdownMenuItem className="min-h-11 gap-3" onSelect={onAddManually}><Type className="h-4 w-4" />Escribir nombre</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
    {searchOpen && <div role="search" aria-label="Añadir un vino del catálogo">{search}</div>}
    {/* 143: the sections are pills that scroll sideways (the look of the wine apps people know) instead of underlined
        tabs; same buttons, counts and menu. With large text they wrap instead of scrolling. */}
    <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [html.matchrim-accessibility-text_&]:flex-wrap">
      <div role="group" aria-label="Sección de tus vinos" className="flex shrink-0 gap-2 [html.matchrim-accessibility-text_&]:shrink [html.matchrim-accessibility-text_&]:flex-wrap">
        {tabs.map(([key, label]) => <button key={key} type="button" aria-pressed={section === key} className={`min-h-11 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm leading-5 ${section === key ? 'border-stone-950 bg-stone-950 font-semibold text-white' : 'border-stone-300 bg-white text-stone-800'}`} onClick={() => onSectionChange(key)}>{label}{!countsUnknown && <span className="ml-1 text-xs tabular-nums">{counts[key]}</span>}</button>)}
      </div>
      <DropdownMenu><DropdownMenuTrigger asChild><button type="button" className={`flex min-h-11 w-11 shrink-0 items-center justify-center rounded-full border ${section === 'favorites' || section === 'rejected' ? 'border-stone-950 bg-stone-950 text-white' : 'border-stone-300 bg-white text-stone-800'}`} aria-label="Más colecciones" title="Más colecciones"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="min-h-11" onSelect={() => onSectionChange('favorites')}>{countsUnknown ? 'Favoritos' : `Favoritos (${counts.favorites})`}</DropdownMenuItem><DropdownMenuItem className="min-h-11" onSelect={() => onSectionChange('rejected')}>{countsUnknown ? 'No repetir' : `No repetir (${counts.rejected})`}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
    {(section === 'favorites' || section === 'rejected') && <p className="flex items-center gap-1 text-sm font-medium text-red-900">{section === 'favorites' ? (countsUnknown ? 'Favoritos' : `Favoritos · ${counts.favorites}`) : (countsUnknown ? 'No repetir' : `No repetir · ${counts.rejected}`)}<ChevronDown className="h-4 w-4" aria-hidden="true" /></p>}
  </header>;
};
