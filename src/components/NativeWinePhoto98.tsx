import { useEffect, useRef, useState } from 'react';
import { Bottle150 } from '@/components/Relief150';
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
  /** 150: the wine's type, to draw a bottle of its colour when there is no photo. */
  type?: string | null;
}

// 133: one catalogue lookup per identity per session; scrolling the cellar back does not repeat it.
const resolvedPhotos133 = new Map<string, string | null>();

export const NativeWinePhoto98 = ({ src, name, identity, resolveMissing = false, className = '', ownedCapture = false, onResolved, type }: Props) => {
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
    if (resolvedPhotos133.has(identityKey)) {
      const cached = resolvedPhotos133.get(identityKey);
      if (cached) { setResolved({ key: identityKey, url: cached }); resolvedCallback.current?.(cached); }
      return;
    }
    const controller = new AbortController();
    void lookupWinerimOriginalSheet(requested, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const photo = result.status === 'verified' ? safeWineImageUrl98(result.sheet.photo) : null;
      if (photo || result.status !== 'unavailable') resolvedPhotos133.set(identityKey, photo);
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
      : <Bottle150 type={type} />}
  </span>;
};
