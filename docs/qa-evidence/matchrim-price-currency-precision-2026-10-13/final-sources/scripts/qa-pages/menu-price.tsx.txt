import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MenuPriceEditor } from '../../src/components/wine-import/MenuPriceEditor';
import type { MenuScanWine } from '../../src/utils/wineMenuScan';
import { formatScanPrice } from '../../src/utils/scanMoney';
import '../../src/index.css';

const original: MenuScanWine = { nombre: 'Referencia sintetica de control', productor: null, anada: null, region: null, pais: null,
  precio: 25, moneda: 'EUR', servicio: 'ambos', precios: { copa: 12, botella: 25 }, tipo: 'tinto', descripcion: null,
  canonicalId: null, sensorySource: 'inference', atributos: null, compatibilidad: null };
function PriceProbe() {
  const [wine, setWine] = useState(original);
  return <main className="mx-auto max-w-xl space-y-4 p-[16px]">
    <MenuPriceEditor wine={wine} index={0} locked={false} onApply={setWine} />
    <p aria-label="Precio aplicado">{formatScanPrice(wine.precio, wine.moneda)}</p>
    <output aria-label="Metadatos de control" className="block break-words text-xs">{JSON.stringify(wine)}</output>
  </main>;
}
createRoot(document.getElementById('root')!).render(<PriceProbe />);
