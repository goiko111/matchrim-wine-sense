import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MenuRecoveryLayout } from '@/utils/menuRecovery95';

interface Props {
  layout: MenuRecoveryLayout;
  columnSplit: number;
  image: string | null;
  disabled: boolean;
  onLayout: (layout: MenuRecoveryLayout) => void;
  onColumnSplit: (split: number) => void;
  onRead: () => void;
}

export const MenuRecoveryControls95 = ({ layout, columnSplit, image, disabled, onLayout, onColumnSplit, onRead }: Props) => (
  <fieldset disabled={disabled} className="w-full min-w-0 space-y-[12px]" data-testid="native-menu-region-controls">
    <Label htmlFor="menu-recovery-layout">Dividir imagen</Label>
    <Select value={layout} onValueChange={value => onLayout(value as MenuRecoveryLayout)} disabled={disabled}>
      <SelectTrigger id="menu-recovery-layout" className="h-auto min-h-[44px] min-w-0 whitespace-normal text-left"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="auto" className="whitespace-normal">Automático · dos zonas</SelectItem>
        <SelectItem value="columns" className="whitespace-normal">Izquierda y derecha · dos páginas</SelectItem>
        <SelectItem value="rows" className="whitespace-normal">Arriba y abajo · carta larga</SelectItem>
        <SelectItem value="quadrants" className="whitespace-normal">Cuatro zonas · carta muy densa</SelectItem>
      </SelectContent>
    </Select>
    {(layout === 'columns' || layout === 'quadrants') && <div className="min-w-0 space-y-[8px]">
      {image && <div className="mx-auto w-fit max-w-full overflow-hidden rounded-md bg-stone-950">
        <div className="relative">
          <img src={image} alt="Páginas de la carta con separación seleccionada" className="block h-auto max-h-[240px] w-auto max-w-full" />
          <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l-[3px] border-amber-400 shadow-[0_0_0_1px_#1c1917]" style={{ left: `${columnSplit}%` }} />
          {layout === 'quadrants' && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-1/2 border-t-[3px] border-amber-400 shadow-[0_0_0_1px_#1c1917]" />}
        </div>
      </div>}
      <Label htmlFor="menu-recovery-divider" className="block">Separación entre páginas</Label>
      <input id="menu-recovery-divider" type="range" min={20} max={80} step={1} value={columnSplit}
        aria-valuetext={`La página izquierda ocupa el ${columnSplit} por ciento de la imagen`}
        className="block min-h-[44px] w-full min-w-0 accent-red-900"
        onChange={event => onColumnSplit(Number(event.target.value))} />
    </div>}
    <Button type="button" variant="outline" className="h-auto min-h-[44px] min-w-0 gap-[8px] whitespace-normal bg-white px-[12px] py-[10px]" onClick={onRead} disabled={disabled}>
      <ScanLine className="h-[20px] w-[20px] shrink-0" />Analizar por zonas
    </Button>
  </fieldset>
);
