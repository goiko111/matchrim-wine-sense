import { useEffect, useRef, useState } from 'react';
import { Wine } from 'lucide-react';
import { safeOwnedWineImage98, safeWineImageUrl98 } from '@/utils/wineImage98';
import { lookupWinerimOriginalSheet, type WinerimOriginalIdentity } from '@/utils/winerimOriginalSheet';

interface Props {
  src?: string | null;
  name: string;
  identity?: WinerimOriginalIdentity;
  resolveMissing?: boolean;
  className?: string;
  ownedCapture?: boolean;
  onResolved?: (url: string) => void;
}

export const NativeWinePhoto98 = ({ src, name, identity, resolveMissing = false, className = '', ownedCapture = false, onResolved }: Props) => {
  const direct = ownedCapture ? safeOwnedWineImage98(src) : safeWineImageUrl98(src);
  const identityKey = JSON.stringify([identity?.name, identity?.producer, identity?.vintage, identity?.region, identity?.country, identity?.inferredFields]);
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const resolvedCallback = useRef(onResolved);
  resolvedCallback.current = onResolved;
  const [resolved, setResolved] = useState<{ key: string; url: string } | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const url = direct || (resolved?.key === identityKey ? resolved.url : null);
  useEffect(() => {
    const requested = identityRef.current;
    if (direct || !resolveMissing || !requested?.name || !requested.producer) return;
    const controller = new AbortController();
    void lookupWinerimOriginalSheet(requested, controller.signal).then(result => {
      if (controller.signal.aborted || result.status !== 'verified') return;
      const photo = safeWineImageUrl98(result.sheet.photo);
      if (photo) {
        setResolved({ key: identityKey, url: photo });
        resolvedCallback.current?.(photo);
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [direct, identityKey, resolveMissing]);
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ${className}`} data-testid="native-wine-photo98">
    {url && failed !== url
      ? <img key={url} src={url} alt={`Botella de ${name}`} className="h-full w-full object-contain p-2" loading="lazy" decoding="async" onError={() => setFailed(url)} />
      : <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-stone-100 text-stone-400">
        <Wine className="h-8 w-8" aria-hidden="true" /><span className="text-xs text-stone-600">Sin foto</span>
      </span>}
  </span>;
};
