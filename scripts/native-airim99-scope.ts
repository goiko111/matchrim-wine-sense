import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export const nativeAiRim99Baseline = 'd7d81e18e5219b1aedcca641f71ae4d46980faf8';
export const nativeAiRim99Paths = ['src/components/AiRimConversation.tsx', 'src/pages/LiquidIntelligence.tsx'] as const;
const digest = (source: string) => createHash('sha256').update(source).digest('hex');
const once = (source: string, current: string, previous: string) => {
  assert.equal(source.split(current).length, 2, 'One exact reviewed native aiRIM99 literal: ' + current);
  return source.replace(current, previous);
};
const files: Record<string, { beforeHash: string; hunks: readonly (readonly [string, string])[] }> = {
  'src/components/AiRimConversation.tsx': {
    beforeHash: 'd607ba642f0a2309334da7e6581cae38c149a2cea767b294e4f103befc6b6630',
    hunks: [
      ["import { NativeAiRimChat99, type AiRimQuickAction99 } from '@/components/NativeAiRimChat99';\n", ''],
      ['  onSelectFunction?: (action: AiRimQuickAction99) => void;\n', ''],
      ["const AiRimConversation = ({ onBack, initialQuestion = '', onSelectFunction }: AiRimConversationProps) => {",
        "const AiRimConversation = ({ onBack, initialQuestion = '' }: AiRimConversationProps) => {"],
      [`  if (isNative) return <NativeAiRimChat99 input={input} messages={messages} loading={isLoading} canSend={nativeCanSend}
    memoryLabel={memoryLabel} notice={(sentNativeContext ?? nativeContext).notice} contextSent={Boolean(sentNativeContext)}
    onInput={setInput} onSend={() => void sendMessage()} onCancel={cancelNativeMessage}
    onBack={() => { cancelNativeMessage(); onBack(); }}
    onProfile={() => navigate(user ? '/profile' : '/matchrim')}
    onScan={() => { cancelNativeMessage(); navigate('/escanear'); }}
    onRestaurant={() => { cancelNativeMessage(); navigate('/restaurante'); }}
    onSelectFunction={onSelectFunction ? action => { cancelNativeMessage(); onSelectFunction(action); } : undefined} />;

`, ''],
    ],
  },
  'src/pages/LiquidIntelligence.tsx': {
    beforeHash: 'b4f0944b3b084764b691dcdd995d8eb3c880fee17f664d6db8b621e2413d0e6f',
    hunks: [
      ['    if (isNative) return <AiRimConversation key="native-landing99" onBack={() => navigate(\'/\')} onSelectFunction={handleSelectFunction} />;\n', ''],
      ['        if (isNative) return <AiRimConversation key={`native-request99:${conversationQuestion}`} onBack={handleBackToMenu} initialQuestion={conversationQuestion} />;\n', ''],
    ],
  },
};

// No AST deletion or normalization: all other controller/page bytes remain pinned.
// The independently executed presentation leaf deliberately has no whole-file hash.
export function restoreNativeAiRim99(file: string, source: string): string {
  assert.ok(Object.hasOwn(files, file), 'Only the two reviewed native aiRIM99 source files may be projected');
  const row = files[file];
  if (digest(source) === row.beforeHash) return source;
  for (const [current, previous] of row.hunks) source = once(source, current, previous);
  assert.equal(digest(source), row.beforeHash,
    `Every ${nativeAiRim99Baseline} byte restored, including profile/owner/model/request/abort/response/web: ${file}`);
  return source;
}

export function restoreNativeAiRim99FeedbackScope96(source: string): string {
  if (digest(source) === 'd91bf23bc5bb71494acd0072d285ccb8682ed9d0ee0f8c1b394a9e0c8586e9af') return source;
  source = once(source, "import { restoreNativeAiRim99 } from './native-airim99-scope';\n", '');
  source = once(source, "  if (file === 'src/components/AiRimConversation.tsx') source = restoreNativeAiRim99(file, source);\n", '');
  assert.equal(digest(source), 'd91bf23bc5bb71494acd0072d285ccb8682ed9d0ee0f8c1b394a9e0c8586e9af',
    'All original server96 inverse pairs, scope pins, child execution and assertions remain exact');
  return source;
}

export function restoreNativeAiRim99FoodSummaryGuard96(source: string): string {
  const baselineHash = '3b0e4f7b140f088d3dd242c99fb6d6a3ef54aebd8df2bb6043986d140a35670d';
  if (digest(source) === baselineHash) return source;
  source = once(source, "import { restoreNativeAiRim99FeedbackScope96 } from './native-airim99-scope';\n", '');
  source = once(source, '  value = restoreNativeAiRim99FeedbackScope96(value);\n', '');
  assert.equal(digest(source), baselineHash,
    `Every ${nativeAiRim99Baseline} Food-summary assertion, baseline, child count and negative control remains exact`);
  return source;
}
