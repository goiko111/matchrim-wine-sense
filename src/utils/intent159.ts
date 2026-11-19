// 159 (owner, 19-nov, from another app's welcome: ask before explaining). Two answers given before the taste test:
// what the person wants Matchrim for and how sure they feel choosing wine. They only order what Home puts first and
// reword a couple of lines; they stay on this iPhone, are never sent anywhere and never touch the taste profile.
export type Goal159 = 'restaurant' | 'home' | 'gift' | 'curious';
export type Confidence159 = 'low' | 'some' | 'high';
export type Intent159 = { goal?: Goal159; confidence?: Confidence159 };
const key = (ownerId: string | null) => `matchrim.intent159:${ownerId ?? 'anonymous'}`;
const GOALS: readonly Goal159[] = ['restaurant', 'home', 'gift', 'curious'], LEVELS: readonly Confidence159[] = ['low', 'some', 'high'];
export const readIntent159 = (ownerId: string | null): Intent159 => {
  try {
    // Answers given before signing in are the same person's: they are read as a fallback, never copied.
    const raw = localStorage.getItem(key(ownerId)) ?? (ownerId ? localStorage.getItem(key(null)) : null);
    const value = raw ? JSON.parse(raw) as Record<string, unknown> : {};
    return { goal: GOALS.find(goal => goal === value.goal), confidence: LEVELS.find(level => level === value.confidence) };
  } catch { return {}; }
};
export const saveIntent159 = (ownerId: string | null, intent: Intent159): void => {
  try { localStorage.setItem(key(ownerId), JSON.stringify({ goal: intent.goal, confidence: intent.confidence })); } catch { /* asked again next time */ }
};
/** What the «scan your first wine» step says and opens, by what the person came for. */
export const firstScan159 = (goal: Goal159 | undefined): { title: string; why: string; to: string } => goal === 'restaurant'
  ? { title: 'Fotografía la carta del restaurante', why: 'Verás qué vino de la carta encaja más contigo.', to: '/escanear/etiqueta' }
  : goal === 'home' ? { title: 'Escanea una botella en la tienda', why: 'Sabrás si te va a gustar antes de comprarla.', to: '/escanear/etiqueta' }
    : goal === 'gift' ? { title: 'Escanea el vino que piensas regalar', why: 'Verás a qué sabe y a quién le puede gustar.', to: '/escanear/etiqueta' }
      : { title: 'Escanea tu primer vino', why: 'Una botella o una carta: verás cuánto encaja contigo.', to: '/escanear/etiqueta' };
