const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;
const PRODUCTS = new Set(['foreign-languages', 'reasoning']);
const GRADING_RULES = new Set([
  'choice-index',
  'exact-text',
  'matching-pairs',
  'exact-word-order',
  'multi-select-options',
  'word-categorisation',
  'reasoning-exact-option',
]);

function validateAnswerKeyManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { valid: false, errors: ['Manifest must be an object.'] };
  }
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    errors.push(`schemaVersion must equal ${SCHEMA_VERSION}.`);
  }
  if (typeof manifest.sourceRevision !== 'string' || !manifest.sourceRevision.trim()) {
    errors.push('sourceRevision is required.');
  }
  if (!Array.isArray(manifest.entries) || manifest.entries.length === 0) {
    errors.push('entries must be a non-empty array.');
  }

  const seen = new Set();
  for (const [index, entry] of (Array.isArray(manifest.entries) ? manifest.entries : []).entries()) {
    const prefix = `entries[${index}]`;
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      errors.push(`${prefix} must be an object.`);
      continue;
    }
    for (const field of ['keyId', 'sourceFile', 'sourceFingerprint', 'gradingRule']) {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        errors.push(`${prefix}.${field} is required.`);
      }
    }
    if (!PRODUCTS.has(entry.product)) {
      errors.push(`${prefix}.product is unsupported.`);
    }
    if (!GRADING_RULES.has(entry.gradingRule)) {
      errors.push(`${prefix}.gradingRule is unsupported.`);
    }
    if (typeof entry.keyId === 'string' && entry.keyId.trim()) {
      if (seen.has(entry.keyId)) errors.push(`Duplicate keyId: ${entry.keyId}`);
      seen.add(entry.keyId);
    }
    if (!entry.answerKey || typeof entry.answerKey !== 'object' || Array.isArray(entry.answerKey)) {
      errors.push(`${prefix}.answerKey must be an object.`);
      continue;
    }

    if (entry.product === 'reasoning') {
      const key = entry.answerKey;
      if (typeof key.correctAnswer !== 'string' || !key.correctAnswer.trim()) {
        errors.push(`${prefix}.answerKey.correctAnswer must be a non-empty string.`);
      }
      if (!Array.isArray(key.acceptedResponses) || key.acceptedResponses.length < 2) {
        errors.push(`${prefix}.answerKey.acceptedResponses must contain the displayed options.`);
      } else if (typeof key.correctAnswer === 'string' && !key.acceptedResponses.includes(key.correctAnswer)) {
        errors.push(`${prefix}.answerKey.correctAnswer must be one of acceptedResponses.`);
      }
    } else if (!Object.keys(entry.answerKey).length) {
      errors.push(`${prefix}.answerKey cannot be empty.`);
    }
  }

  if (manifest.counts && typeof manifest.counts === 'object') {
    const expected = manifest.counts.totalEntries;
    if (expected !== undefined && expected !== manifest.entries?.length) {
      errors.push('counts.totalEntries does not match entries.length.');
    }
  }

  return { valid: errors.length === 0, errors };
}

function createAnswerKeyRegistry(manifest) {
  const validation = validateAnswerKeyManifest(manifest);
  if (!validation.valid) {
    const error = new Error(`Invalid secure grading answer-key manifest:\n- ${validation.errors.join('\n- ')}`);
    error.validationErrors = validation.errors;
    throw error;
  }

  const byKeyId = new Map(manifest.entries.map((entry) => [entry.keyId, Object.freeze(entry)]));
  return Object.freeze({
    size: byKeyId.size,
    get(keyId) {
      return byKeyId.get(String(keyId)) || null;
    },
    has(keyId) {
      return byKeyId.has(String(keyId));
    },
    productEntries(product) {
      return manifest.entries.filter((entry) => entry.product === product);
    },
  });
}

function loadAnswerKeyRegistry(manifestPath = path.join(__dirname, '..', 'data', 'secure-grading', 'answer-keys.generated.json')) {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(
      'Secure grading answer keys have not been generated yet. Run the documented export step from the frontend question banks before enabling server grading.'
    );
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return createAnswerKeyRegistry(manifest);
}

module.exports = {
  SCHEMA_VERSION,
  PRODUCTS,
  GRADING_RULES,
  validateAnswerKeyManifest,
  createAnswerKeyRegistry,
  loadAnswerKeyRegistry,
};
