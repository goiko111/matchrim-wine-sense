type TrainingEvidence = {
  id?: string;
  rating?: string | null;
  use_for_profile_training?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

export const selectMatchrimTrainingEvidence = <T extends TrainingEvidence>(rows: T[]): T[] => {
  const latest = new Map<string, T>();
  const withoutId: T[] = [];
  const timestamp = (row: T) => {
    const parsed = Date.parse(row.updated_at || row.created_at || '');
    return Number.isFinite(parsed) ? parsed : -Infinity;
  };
  for (const row of rows) {
    if (!row.id) { withoutId.push(row); continue; }
    const previous = latest.get(row.id);
    if (previous && timestamp(row) === timestamp(previous)
      && (row.rating !== previous.rating || row.use_for_profile_training === false
        || previous.use_for_profile_training === false || row.use_for_profile_training === null
        || previous.use_for_profile_training === null)) {
      latest.set(row.id, { ...row, use_for_profile_training: false });
      continue;
    }
    if (!previous || timestamp(row) >= timestamp(previous)) latest.set(row.id, row);
  }
  // Resolve updates before filtering: a newer unrated/opted-out row removes the
  // older evidence. Different row IDs (including vintages) are never collapsed.
  return [...withoutId, ...latest.values()].filter((row) => row.use_for_profile_training !== false
    && row.use_for_profile_training !== null
    && ['love', 'ok', 'not_for_me'].includes(row.rating || ''));
};
