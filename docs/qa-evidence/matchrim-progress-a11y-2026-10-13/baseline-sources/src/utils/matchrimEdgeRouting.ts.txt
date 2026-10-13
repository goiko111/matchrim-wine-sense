const candidateFunctions = new Set([
  'detect-wine-regions',
  'analyze-wine-region',
  'scan-wine-menu',
  'calculate-wine-affinity',
]);

export const resolveMatchrimEdgeFunctionName = (name: string, release?: string): string => {
  if (release === '75' && name === 'search-wines') return `${name}-v75`;
  if ((release === '73' || release === '75') && name === 'calculate-wine-affinity') return `${name}-v73`;
  if (['72', '73', '75'].includes(release || '') && candidateFunctions.has(name)) return `${name}-v72`;
  return name;
};
