import { runMatchrimAi as runSharedMatchrimAi } from '../matchrim-ai-provider.ts';
export type { MatchrimAiResult } from '../matchrim-ai-provider.ts';

export const runMatchrimAi = async (request: Parameters<typeof runSharedMatchrimAi>[0]) => {
  const result = await runSharedMatchrimAi(request);
  if (result.complete !== true) throw new Error('La respuesta de IA esta incompleta. Repite el analisis.');
  return result;
};
