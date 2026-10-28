const assert = require('assert');
const {
  createAnswerKeyRegistry,
  validateAnswerKeyManifest,
} = require('../grading/answerKeyRegistry');

const manifest = {
  schemaVersion: 1,
  sourceRevision: 'test-fixture-revision',
  counts: { totalEntries: 2 },
  entries: [
    {
      keyId: 'reasoning:Q-L1-S1-EXP-sample:Q-SAMPLE-1',
      product: 'reasoning',
      sourceFile: 'src/Data/Reasoning/sampleRuntimeBank.js',
      sourceFingerprint: 'sha256:reasoning-fixture',
      gradingRule: 'reasoning-exact-option',
      activityId: 'Q-L1-S1-EXP-sample',
      questionId: 'Q-SAMPLE-1',
      answerKey: {
        correctAnswer: 'Option B',
        acceptedResponses: ['Option A', 'Option B', 'Option C', 'Option D'],
        explanation: 'Fixture explanation.',
      },
    },
    {
      keyId: 'foreign-languages:exercise:french:quiz-1:q0001',
      product: 'foreign-languages',
      sourceFile: 'src/Data/ExerciseData/french.js',
      sourceFingerprint: 'sha256:foreign-language-fixture',
      gradingRule: 'choice-index',
      answerKey: { correctAnswer: 2, answerIndexBase: 1 },
    },
  ],
};

const valid = validateAnswerKeyManifest(manifest);
assert.strictEqual(valid.valid, true, valid.errors.join('\n'));

const registry = createAnswerKeyRegistry(manifest);
assert.strictEqual(registry.size, 2);
assert.strictEqual(registry.has('reasoning:Q-L1-S1-EXP-sample:Q-SAMPLE-1'), true);
assert.strictEqual(
  registry.get('reasoning:Q-L1-S1-EXP-sample:Q-SAMPLE-1').answerKey.correctAnswer,
  'Option B'
);
assert.strictEqual(registry.get('missing-key'), null);
assert.strictEqual(registry.productEntries('reasoning').length, 1);
assert.strictEqual(registry.productEntries('foreign-languages').length, 1);

const duplicate = structuredClone(manifest);
duplicate.entries[1].keyId = duplicate.entries[0].keyId;
assert.strictEqual(validateAnswerKeyManifest(duplicate).valid, false);

const invalidReasoning = structuredClone(manifest);
invalidReasoning.entries[0].answerKey.correctAnswer = 'Not a displayed choice';
assert.strictEqual(validateAnswerKeyManifest(invalidReasoning).valid, false);

const missingAnswer = structuredClone(manifest);
missingAnswer.entries[1].answerKey = {};
assert.strictEqual(validateAnswerKeyManifest(missingAnswer).valid, false);

const wrongCount = structuredClone(manifest);
wrongCount.counts.totalEntries = 99;
assert.strictEqual(validateAnswerKeyManifest(wrongCount).valid, false);

console.log('Secure grading answer-key registry tests passed.');
