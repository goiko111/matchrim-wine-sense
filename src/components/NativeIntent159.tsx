import { useState } from 'react';
import { readIntent159, saveIntent159, type Confidence159, type Goal159, type Intent159 } from '@/utils/intent159';

// 159: two questions on the test's cover, answered with one tap each and never required. See intent159.
const goals: Array<[Goal159, string]> = [['restaurant', 'Elegir en el restaurante'], ['home', 'Comprar para casa'], ['gift', 'Acertar con un regalo'], ['curious', 'Solo curiosidad']];
const levels: Array<[Confidence159, string]> = [['low', 'Poca'], ['some', 'Algo'], ['high', 'Bastante']];
const chip = (on: boolean) => `min-h-11 rounded-full border px-4 py-2 text-sm font-semibold leading-5 [overflow-wrap:anywhere] ${on ? 'border-red-900 bg-red-900 text-white' : 'border-stone-300 bg-white text-stone-800 active:bg-stone-100'}`;

export const NativeIntent159 = ({ ownerId }: { ownerId: string | null }) => {
  const [intent, setIntent] = useState<Intent159>(() => readIntent159(ownerId));
  // Read back from storage, not from this render: two taps in a row must both stay.
  const set = (patch: Intent159) => { const next = { ...readIntent159(ownerId), ...patch }; saveIntent159(ownerId, next); setIntent(next); };
  return <div className="mt-6 space-y-4" data-testid="intent159">
    <fieldset className="min-w-0">
      <legend className="text-base font-bold leading-6 text-stone-950">¿Para qué quieres Matchrim?</legend>
      <div className="mt-2 flex flex-wrap gap-2">{goals.map(([goal, label]) =>
        <button key={goal} type="button" aria-pressed={intent.goal === goal} data-testid={`intent-goal159-${goal}`} className={chip(intent.goal === goal)} onClick={() => set({ goal })}>{label}</button>)}</div>
    </fieldset>
    <fieldset className="min-w-0">
      <legend className="text-base font-bold leading-6 text-stone-950">¿Cuánta seguridad tienes al elegir un vino?</legend>
      <div className="mt-2 flex flex-wrap gap-2">{levels.map(([level, label]) =>
        <button key={level} type="button" aria-pressed={intent.confidence === level} data-testid={`intent-level159-${level}`} className={chip(intent.confidence === level)} onClick={() => set({ confidence: level })}>{label}</button>)}</div>
      {intent.confidence === 'low' && <p className="mt-2 text-sm leading-5 text-stone-700" data-testid="intent-low159">Para eso está: tú dices qué te gusta comer y Matchrim lo traduce a vinos.</p>}
    </fieldset>
  </div>;
};
