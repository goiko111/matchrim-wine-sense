import { useState } from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MenuScanWine } from '@/utils/wineMenuScan';
import { normalizeScanCurrency } from '@/utils/scanMoney';
import { manualMenuPriceLines, parseMenuPriceDraft, resolveMenuPriceReview } from '@/utils/menuPriceReview';

export function MenuPriceEditor({ wine, index, locked, onApply }: {
  wine: MenuScanWine; index: number; locked: boolean; onApply: (wine: MenuScanWine) => void;
}) {
  const initialFormat = wine.precio_manual_asignacion?.format
    ?? (!wine.campos_inferidos?.includes('servicio') && (wine.servicio === 'copa' || wine.servicio === 'botella') ? wine.servicio : 'unknown');
  const [amount, setAmount] = useState(wine.precio?.toString() ?? '');
  const [currency, setCurrency] = useState(normalizeScanCurrency(wine.moneda) ?? 'unknown');
  const [format, setFormat] = useState<string>(initialFormat);
  const [touched, setTouched] = useState(false);
  const [notice, setNotice] = useState('');
  const parsed = parseMenuPriceDraft(amount);
  const ready = !locked && parsed.amount !== null && currency !== 'unknown' && (format === 'copa' || format === 'botella');
  const changedCurrency = currency !== 'unknown' && normalizeScanCurrency(wine.moneda) !== currency;
  const serviceConflict = !wine.campos_inferidos?.includes('servicio') && (wine.servicio === 'copa' || wine.servicio === 'botella')
    && (format === 'copa' || format === 'botella') && format !== wine.servicio;
  const reset = () => {
    setAmount(wine.precio?.toString() ?? ''); setCurrency(normalizeScanCurrency(wine.moneda) ?? 'unknown');
    setFormat(initialFormat); setTouched(false); setNotice('Cambio descartado; el precio de la carta no se ha modificado.');
  };
  return <fieldset disabled={locked} role="group" aria-label="Revisar precio de carta" className="min-w-0 space-y-3 border-t border-slate-200 pt-3 md:col-span-2">
    <legend className="text-sm font-semibold">Precio de carta</legend>
    <div className="grid min-w-0 gap-3 sm:grid-cols-3">
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`scan-price-${index}`}>Importe</Label>
        <Input id={`scan-price-${index}`} className="min-h-11" inputMode="decimal" value={amount}
          aria-invalid={touched && Boolean(parsed.error)} aria-describedby={touched && parsed.error ? `scan-price-error-${index}` : undefined}
          onChange={(event) => { setAmount(event.target.value); setTouched(true); setNotice(''); }} />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`scan-price-format-${index}`}>Formato del precio</Label>
        <Select disabled={locked} value={format} onValueChange={(value) => { setFormat(value); setNotice(''); }}>
          <SelectTrigger id={`scan-price-format-${index}`} className="h-auto min-h-11 [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left [&>svg]:shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]">
            <SelectItem className="min-h-11" value="unknown">Sin confirmar</SelectItem>
            <SelectItem className="min-h-11" value="copa">Copa</SelectItem>
            <SelectItem className="min-h-11" value="botella">Botella</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={`scan-currency-${index}`}>Moneda</Label>
        <Select disabled={locked} value={currency} onValueChange={(value) => { setCurrency(value); setNotice(''); }}>
          <SelectTrigger id={`scan-currency-${index}`} className="h-auto min-h-11 [&>span]:line-clamp-none [&>span]:whitespace-normal [&>span]:text-left [&>svg]:shrink-0"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[min(24rem,var(--radix-select-content-available-height))]"><SelectItem className="min-h-11" value="unknown">Sin confirmar</SelectItem>
            {['EUR', 'GBP', 'USD', 'CHF', 'CAD', 'AUD', 'NZD', 'JPY', 'CNY', 'SEK', 'NOK', 'DKK'].map((code) => <SelectItem className="min-h-11" key={code} value={code}>{code}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
    {touched && parsed.error && <p id={`scan-price-error-${index}`} className="text-sm text-red-800">{parsed.error}</p>}
    {changedCurrency && <p className="text-sm text-amber-900">Los otros importes no se convertirán a esta moneda. Se conservará la lectura anterior.</p>}
    {serviceConflict && <p className="text-sm text-amber-900">El formato del precio es distinto del servicio leído en la carta. Disponibilidad pendiente de confirmar.</p>}
    {locked ? <p className="text-sm text-slate-600">Precio vinculado al guardado anterior; no se modifica desde esta ficha.</p>
      : <p className="text-xs text-slate-600">El formato del precio no confirma la disponibilidad por copa o botella.</p>}
    <div className="flex flex-wrap gap-2">
      <Button type="button" className="min-h-11 gap-2 whitespace-normal" disabled={!ready} onClick={() => {
        if (!ready || parsed.amount === null || (format !== 'copa' && format !== 'botella')) return;
        const updated = resolveMenuPriceReview(wine, parsed.amount, format, currency);
        onApply(updated); setTouched(false); setNotice(manualMenuPriceLines(updated).join(' \u00b7 '));
      }}><Check className="h-4 w-4 shrink-0" />Aplicar precio</Button>
      <Button type="button" variant="outline" className="min-h-11 gap-2 whitespace-normal" disabled={locked} onClick={reset}><RotateCcw className="h-4 w-4 shrink-0" />Descartar cambio</Button>
    </div>
    <p role="status" aria-live="polite" className="break-words text-sm font-medium text-emerald-800">{notice}</p>
  </fieldset>;
}
