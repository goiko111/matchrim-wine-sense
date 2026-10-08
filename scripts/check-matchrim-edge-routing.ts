import assert from 'node:assert/strict';
import { resolveMatchrimEdgeFunctionName } from '../src/utils/matchrimEdgeRouting';

const candidateFunctions = ['detect-wine-regions', 'analyze-wine-region', 'scan-wine-menu', 'calculate-wine-affinity'];
const existingFunctions = ['search-wines', 'winerim-wines', 'matchrim-recommendations', 'ai-wine-chat'];
let checks = 0;
for (const name of [...candidateFunctions, ...existingFunctions]) {
  for (const release of [undefined, '', '71', 'staging']) {
    assert.equal(resolveMatchrimEdgeFunctionName(name, release), name);
    checks++;
  }
  assert.equal(resolveMatchrimEdgeFunctionName(name, '72'), candidateFunctions.includes(name) ? `${name}-v72` : name);
  checks++;
  for (const release of ['73', '75']) {
    const expected = release === '75' && name === 'search-wines' ? 'search-wines-v75'
      : name === 'calculate-wine-affinity' ? 'calculate-wine-affinity-v73'
      : candidateFunctions.includes(name) ? `${name}-v72` : name;
    assert.equal(resolveMatchrimEdgeFunctionName(name, release), expected);
    checks++;
  }
}
assert.equal(resolveMatchrimEdgeFunctionName('scan-wine-menu-v72', '72'), 'scan-wine-menu-v72');
checks++;
assert.equal(resolveMatchrimEdgeFunctionName('search-wines-v75', '75'), 'search-wines-v75');
checks++;
console.log(`Matchrim edge routing: ${checks}/${checks} assertions passed`);
