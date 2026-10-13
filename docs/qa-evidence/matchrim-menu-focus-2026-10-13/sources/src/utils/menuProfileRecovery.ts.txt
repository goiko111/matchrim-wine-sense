import type { MenuScanWine } from './wineMenuScan';
import { isMenuIdentityConfirmed } from './wineMenuScan';
import type { MatchrimProfileLike } from './matchrimPassport';
import { calculateLocalMatchrimAffinity } from './wineAffinityExplanation';

// Reuse only the separately matched sheet already in this batch, never OCR attributes/raw score.
export const refreshMenuProfileAffinity = (wine: MenuScanWine, profile: MatchrimProfileLike | null): MenuScanWine => {
  const grounded = wine.sensorySource === 'catalog' && Boolean(wine.canonicalId?.trim())
    && isMenuIdentityConfirmed(wine) && Boolean(wine.atributos);
  const score = grounded ? calculateLocalMatchrimAffinity(profile, wine.atributos) : null;
  return {
    ...wine, compatibilidad: score, affinity_calibrated: score !== null,
    razon: score !== null
      ? `Afinidad calculada localmente con tu perfil y la ficha Winerim ${wine.canonicalId}; no es una probabilidad de que te guste.`
      : !profile ? 'Perfil no disponible para este an\u00e1lisis; afinidad pendiente.'
        : 'Tu perfil est\u00e1 disponible, pero falta una ficha sensorial verificada de este vino; afinidad pendiente.',
  };
};
