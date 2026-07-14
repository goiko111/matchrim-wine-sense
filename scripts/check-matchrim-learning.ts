import assert from 'node:assert/strict';

import { calculateLearnedMatchrimProfile } from '../src/utils/matchrimLearning';
import { generateMatchrimCode } from '../src/utils/matchrimPassport';
import { generateMatchrimName, generateWineStyles } from '../src/utils/profileUtils';

const baseProfile = {
  potente: 2,
  acidez: 2,
  dulce: 2,
  tanico: 2,
  afrutado: 2,
};

const lovedProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'love',
    sensory_attributes: {
      potencia: 5,
      acidez: 4,
      dulzura: 3,
      taninos: 4,
      afrutado: 5,
    },
  },
]);

assert.equal(lovedProfile.samples, 1);
assert.ok(lovedProfile.confidence > 0);
assert.ok(lovedProfile.profile.potente > baseProfile.potente);
assert.ok(lovedProfile.profile.afrutado > baseProfile.afrutado);
assert.doesNotThrow(() => generateWineStyles(lovedProfile.profile));
assert.equal(generateWineStyles(lovedProfile.profile).length, 3);

const stablePublicCode = generateMatchrimCode(baseProfile);
assert.equal(stablePublicCode, generateMatchrimName(baseProfile));
const learnedProfileCode = generateMatchrimCode(lovedProfile.profile);
assert.equal(learnedProfileCode, generateMatchrimName(lovedProfile.profile));
assert.notEqual(
  learnedProfileCode,
  stablePublicCode,
  'This fixture must prove that learned profiles can rename the public code if used directly.'
);
assert.equal(generateMatchrimCode(baseProfile), stablePublicCode);

const rejectedProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'not_for_me',
    sensory_attributes: {
      potencia: 5,
      acidez: 4,
      dulzura: 3,
      taninos: 4,
      afrutado: 5,
    },
  },
]);

assert.equal(rejectedProfile.samples, 1);
assert.ok(rejectedProfile.profile.potente < baseProfile.potente);
assert.ok(rejectedProfile.profile.afrutado < baseProfile.afrutado);

const ignoredProfile = calculateLearnedMatchrimProfile(baseProfile, [
  {
    rating: 'love',
    sensory_attributes: null,
  },
]);

assert.equal(ignoredProfile.samples, 0);
assert.deepEqual(ignoredProfile.profile, baseProfile);

console.log('Matchrim learning checks passed');
