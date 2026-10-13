export const manualWineIdentityNotice = (affinity: number | null | undefined): string => {
  const hasAffinity = typeof affinity === 'number' && Number.isFinite(affinity)
    && affinity >= 0 && affinity <= 100;
  return hasAffinity
    ? 'Identidad revisada por ti. La afinidad conserva los datos previos; confirmar la identidad no recalcula el resultado.'
    : 'Identidad revisada por ti. Afinidad pendiente de ficha sensorial y perfil suficientes.';
};
