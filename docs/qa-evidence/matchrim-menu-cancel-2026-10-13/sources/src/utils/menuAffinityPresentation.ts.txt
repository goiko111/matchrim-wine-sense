export interface MenuAffinityPresentation {
  state: 'pending' | 'calculated';
  score: number | null;
  label: string;
  description: string;
  className: string;
}

// Presentation only: preserve an accredited finite score, never compute or coerce one.
export const presentMenuAffinity = (score: unknown, calibrated: boolean, pendingReason?: string | null): MenuAffinityPresentation => {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score > 100 || !calibrated) {
    return {
      state: 'pending', score: null, label: 'Afinidad pendiente',
      description: pendingReason || 'No hay una afinidad calculada con datos suficientes para este vino.',
      className: 'border-stone-200 bg-stone-50 text-stone-700',
    };
  }
  const common = { state: 'calculated' as const, score };
  if (score >= 85) return { ...common, label: 'Pedir\u00eda', description: 'Prioridad alta para tu perfil Matchrim.', className: 'border-green-200 bg-green-50 text-green-900' };
  if (score >= 70) return { ...common, label: 'Buen candidato', description: 'Encaja bien, revisa precio y estilo antes de elegir.', className: 'border-amber-200 bg-amber-50 text-amber-950' };
  if (score >= 55) return { ...common, label: 'Con matices', description: 'Puede gustarte si quieres algo menos evidente.', className: 'border-orange-200 bg-orange-50 text-orange-950' };
  return { ...common, label: 'No priorizar\u00eda', description: 'No parece la mejor opci\u00f3n de esta carta para ti.', className: 'border-red-200 bg-red-50 text-red-950' };
};
