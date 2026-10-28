#!/usr/bin/env node
'use strict';

/*
 * Export answer keys from the real frontend-delivered question sets into the
 * Backend repository only. This does not edit frontend question banks or
 * change any runtime route. Run from the Backend repository root after both
 * repositories are checked out locally and frontend dependencies are installed.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const backendRoot = path.resolve(__dirname, '..');
const frontendRoot = path.resolve(
  process.env.FRONTEND_REPO_PATH || path.join(backendRoot, '..', 'Aprioriedunext')
);
const outputDir = path.join(backendRoot, 'data', 'secure-grading');
const manifestPath = path.join(outputDir, 'answer-keys.generated.json');
const auditPath = path.join(outputDir, 'answer-key-export-audit.json');

const sourceGroups = [
  {
    family: 'exercise',
    product: 'foreign-languages',
    relativeDir: 'src/Data/ExerciseData',
    exportName: 'quiz',
    answerIndexBase: 1,
  },
  {
    family: 'quiz-time',
    product: 'foreign-languages',
    relativeDir: 'src/Data',
    exportName: 'quiz',
    filePattern: /^[a-z]+questions\.js$/i,
    answerIndexBase: 1,
  },
  {
    family: 'practice-test',
    product: 'foreign-languages',
    relativeDir: 'src/Data/Practicetests',
    exportName: 'quiz',
    answerIndexBase: 1,
  },
  {
    family: 'reading-assignment',
    product: 'foreign-languages',
    relativeDir: 'src/Data/ReadingAssignments',
    exportName: 'data',
    answerIndexBase: 0,
  },
  {
    family: 'listening-assignment',
    product: 'foreign-languages',
    relativeDir: 'src/Data/ListeningAssignments',
    exportName: 'data',
    answerIndexBase: 0,
  },
];

const pad = (number) => String(number).padStart(4, '0');
const slug = (value) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '') || 'unnamed';
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function gitValue(args) {
  try {
    return execFileSync('git', ['-C', frontendRoot, ...args], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function registerFrontendJsLoader() {
  const frontendNodeModules = path.join(frontendRoot, 'node_modules');
  const swcEntrypoint = path.join(frontendNodeModules, 'next', 'dist', 'build', 'swc');
  if (!fs.existsSync(swcEntrypoint + '.js') && !fs.existsSync(path.join(swcEntrypoint, 'index.js'))) {
    throw new Error(
      'Cannot find the frontend Next.js SWC loader. First install the locked frontend dependencies in the Aprioriedunext folder (npm ci), then rerun this export.'
    );
  }

  const swc = require(swcEntrypoint);
  if (typeof swc.transformSync !== 'function') {
    throw new Error('The installed Next.js SWC package does not expose transformSync; no answer-key file was generated.');
  }

  const Module = require('module');
  const originalJsLoader = Module._extensions['.js'];
  const originalResolveFilename = Module._resolveFilename;

  // Support the frontend's existing @/ imports, while resolving everything
  // relative to the frontend repository rather than the Backend repository.
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      request = path.join(frontendRoot, request.slice(2));
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._extensions['.js'] = function (module, filename) {
    const relative = path.relative(frontendRoot, filename);
    const isFrontendSource = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
    const isNodeModule = relative.split(path.sep).includes('node_modules');
    if (!isFrontendSource || isNodeModule) {
      return originalJsLoader(module, filename);
    }

    const source = fs.readFileSync(filename, 'utf8');
    const transformed = swc.transformSync(source, {
      filename,
      sourceMaps: false,
      jsc: {
        parser: { syntax: 'ecmascript', jsx: true, dynamicImport: true },
        target: 'es2020',
        transform: { react: { runtime: 'automatic' } },
      },
      module: { type: 'commonjs' },
    });
    module._compile(transformed.code, filename);
  };
}

function listJsFiles(directory, filePattern, recursive = true) {
  if (!fs.existsSync(directory)) {
    throw new Error(`Required frontend question-bank directory does not exist: ${directory}`);
  }
  const found = [];
  const walk = (current) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, item.name);
      if (item.isDirectory() && recursive) walk(absolute);
      else if (item.isFile() && item.name.endsWith('.js') && (!filePattern || filePattern.test(item.name))) {
        found.push(absolute);
      }
    }
  };
  walk(directory);
  return found.sort();
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function responseKind(question) {
  return String(question?.type || question?.questionType || '').trim().toLowerCase();
}

function resolveForeignLanguageAnswerKey(question, family, answerIndexBase) {
  if (!question || typeof question !== 'object' || Array.isArray(question)) {
    return { issue: 'question record is not an object' };
  }

  const type = responseKind(question);
  if (Array.isArray(question.pairs) || type.includes('matchthefollowing') || type.includes('matching')) {
    if (!Array.isArray(question.pairs) || question.pairs.length === 0) {
      return { issue: 'matching question has no pairs' };
    }
    const malformed = question.pairs.some((pair) =>
      !pair?.left || !pair?.right ||
      pair.left.rightId === undefined || pair.right.rightId === undefined
    );
    if (malformed) return { issue: 'matching question contains a pair without both rightId fields' };
    return {
      gradingRule: 'matching-pairs',
      answerKey: {
        leftToRight: question.pairs.map((pair) => ({
          left: String(pair.left.word ?? ''),
          rightId: pair.left.rightId,
        })),
        rightOptions: question.pairs.map((pair) => ({
          word: String(pair.right.word ?? ''),
          rightId: pair.right.rightId,
        })),
      },
    };
  }

  if (Array.isArray(question.correctAnswers)) {
    if (!question.correctAnswers.length) return { issue: 'correctAnswers array is empty' };
    return {
      gradingRule: 'multi-select-options',
      answerKey: { correctAnswers: cloneData(question.correctAnswers) },
    };
  }

  if (Array.isArray(question.initialWords) && Array.isArray(question.types)) {
    if (question.initialWords.some((item) => !item || item.word === undefined || item.type === undefined)) {
      return { issue: 'categorisation question has a word without an expected type' };
    }
    return {
      gradingRule: 'word-categorisation',
      answerKey: {
        categories: question.types.map((item) => String(item)),
        categoriesByWord: question.initialWords.map((item) => ({
          word: String(item.word),
          category: String(item.type),
        })),
      },
    };
  }

  if (/jumbled|reorder|word order|sentence order/.test(type) ||
      question.correctOrder !== undefined || question.correctSequence !== undefined) {
    const expected = question.correctOrder ?? question.correctSequence ?? question.answer ?? question.question;
    if (typeof expected !== 'string' || !expected.trim()) {
      return { issue: 'ordering question has no expected sequence/text' };
    }
    return {
      gradingRule: 'exact-word-order',
      answerKey: { expectedText: expected },
    };
  }

  if (Object.prototype.hasOwnProperty.call(question, 'correctAnswer')) {
    const answer = question.correctAnswer;
    if (Array.isArray(question.choices) && typeof answer === 'number' && Number.isInteger(answer)) {
      if (type.includes('fill') || type.includes('blank')) {
        const expectedText = question.choices[answer - answerIndexBase];
        if (typeof expectedText !== 'string' || !expectedText.trim()) {
          return { issue: `fill-in answer index ${answer} does not resolve to a non-empty expected choice using index base ${answerIndexBase}` };
        }
        return {
          gradingRule: 'exact-text',
          answerKey: { expectedText, sourceCorrectAnswer: answer, answerIndexBase },
        };
      }
      const choiceIndex = answer - answerIndexBase;
      if (choiceIndex < 0 || choiceIndex >= question.choices.length) {
        return { issue: `correctAnswer ${answer} is outside ${question.choices.length} choices for index base ${answerIndexBase}` };
      }
      return {
        gradingRule: 'choice-index',
        answerKey: {
          correctAnswer: answer,
          answerIndexBase,
          choiceCount: question.choices.length,
        },
      };
    }

    if (typeof answer === 'string' && answer.trim()) {
      return { gradingRule: 'exact-text', answerKey: { expectedText: answer } };
    }
    return { issue: 'correctAnswer is present but cannot be safely interpreted' };
  }

  if (typeof question.answer === 'string' && question.answer.trim()) {
    if (Array.isArray(question.options)) {
      if (question.options.length < 2 || !question.options.includes(question.answer)) {
        return { issue: 'answer/options do not form a valid single-select question' };
      }
      return {
        gradingRule: 'exact-text',
        answerKey: {
          expectedText: question.answer,
          acceptedResponses: cloneData(question.options),
          explanation: typeof question.explanation === 'string' ? question.explanation : '',
        },
      };
    }
    return { gradingRule: 'exact-text', answerKey: { expectedText: question.answer } };
  }

  if (question.answerKey && typeof question.answerKey === 'object' && !Array.isArray(question.answerKey)) {
    return { gradingRule: 'exact-text', answerKey: cloneData(question.answerKey) };
  }

  return { issue: `no recognized answer-key field for response type "${type || 'unspecified'}"` };
}

function collectQuestions(record, family) {
  const collected = [];
  if (family === 'listening-assignment' && Array.isArray(record?.questionsPerAudio)) {
    record.questionsPerAudio.forEach((audioQuestions, audioIndex) => {
      walkQuestionCollection(audioQuestions, [`audio${pad(audioIndex + 1)}`], collected);
    });
  } else if (Array.isArray(record?.questions)) {
    walkQuestionCollection(record.questions, [], collected);
  } else if (record && typeof record.question === 'string') {
    collected.push({ question: record, indexPath: [1] });
  }
  return collected;
}

function walkQuestionCollection(collection, prefix, output) {
  if (!Array.isArray(collection)) return;
  collection.forEach((item, index) => {
    if (Array.isArray(item)) {
      walkQuestionCollection(item, [...prefix, index + 1], output);
    } else if (item && typeof item === 'object' && !Array.isArray(item) &&
      (typeof item.question === 'string' || item.type || item.correctAnswer !== undefined ||
       item.correctAnswers !== undefined || item.pairs || item.initialWords)) {
      output.push({ question: item, indexPath: [...prefix, index + 1] });
    } else {
      output.push({ question: item, indexPath: [...prefix, index + 1] });
    }
  });
}

function exportForeignLanguageKeys() {
  const entries = [];
  const sources = [];
  const issues = [];

  for (const group of sourceGroups) {
    const absoluteDir = path.join(frontendRoot, group.relativeDir);
    const files = listJsFiles(absoluteDir, group.filePattern, group.family !== 'quiz-time');
    for (const file of files) {
      const sourceFile = path.relative(frontendRoot, file).split(path.sep).join('/');
      let exported;
      try {
        const loaded = require(file);
        exported = loaded[group.exportName] ?? loaded.default?.[group.exportName] ?? loaded.default;
      } catch (error) {
        issues.push({ product: group.product, sourceFile, issue: `module load failed: ${error.message}` });
        continue;
      }
      if (!Array.isArray(exported)) {
        issues.push({ product: group.product, sourceFile, issue: `expected an exported array named "${group.exportName}"` });
        continue;
      }

      let questionCount = 0;
      exported.forEach((record, bankIndex) => {
        if (!record || typeof record !== 'object') {
          issues.push({ product: group.product, sourceFile, issue: `bank record ${bankIndex + 1} is not an object` });
          return;
        }
        const bankRef = record.quiz ?? record.id ?? record.name ?? bankIndex + 1;
        const bankId = `${group.family}:${sourceFile}:${slug(bankRef)}`;
        const questions = collectQuestions(record, group.family);
        if (!questions.length) {
          issues.push({ product: group.product, sourceFile, bankId, issue: 'bank record contains no recognized question collection' });
          return;
        }
        for (const item of questions) {
          questionCount += 1;
          const key = resolveForeignLanguageAnswerKey(item.question, group.family, group.answerIndexBase);
          const indexPath = item.indexPath.map((index) => typeof index === 'string' ? index : `q${pad(index)}`).join('-');
          const keyId = `foreign-languages:${bankId}:${indexPath}`;
          if (key.issue) {
            issues.push({
              product: group.product,
              sourceFile,
              bankId,
              keyId,
              questionType: responseKind(item.question),
              issue: key.issue,
            });
            continue;
          }
          const canonicalQuestion = JSON.stringify(item.question);
          entries.push({
            keyId,
            product: group.product,
            family: group.family,
            sourceFile,
            sourceFingerprint: `sha256:${sha256(canonicalQuestion)}`,
            bankId,
            questionId: item.question.id ? String(item.question.id) : keyId,
            questionType: item.question.type || item.question.questionType || 'single-select',
            gradingRule: key.gradingRule,
            answerKey: key.answerKey,
          });
        }
      });
      sources.push({ product: group.product, family: group.family, sourceFile, bankRecordCount: exported.length, questionCount });
    }
  }

  return { entries, sources, issues };
}

function getReasoningRuntimeModules() {
  const dataRoot = path.join(frontendRoot, 'src', 'Data', 'Reasoning');
  const requireSource = (relative) => require(path.join(dataRoot, relative));
  return {
    getActivities: requireSource('activities.js').getActivities,
    level2Activities: requireSource('level2Stage1Activities.js').LEVEL2_STAGE1_ACTIVITIES,
    getLevel2Stage1QuestionsForActivity: requireSource('questionBankLevel2Stage1.js').getLevel2Stage1QuestionsForActivity,
    getStage1CalibratedQuestions: requireSource('stage1QuestionCalibration.js').getStage1CalibratedQuestions,
    getMissingStage1ReplacementQuestionsForActivity: requireSource('stage1MissingReplacements.js').getMissingStage1ReplacementQuestionsForActivity,
    getStage2CalibratedQuestions: requireSource('stage2QuestionCalibration.js').getStage2CalibratedQuestions,
    getStage3CalibratedQuestions: requireSource('stage3CompleteCalibration.js').getStage3CalibratedQuestions,
  };
}

function uniqueQuestions(items) {
  const seen = new Set();
  return items.filter((question) => {
    if (!question?.id || seen.has(question.id)) return false;
    seen.add(question.id);
    return true;
  });
}

function resolveReasoningQuestions(activity, modules) {
  const stage = Number(String(activity.stageId || '').replace('S', '')) || 1;
  if (activity.levelId === 'L2' && stage === 1) {
    return uniqueQuestions(modules.getLevel2Stage1QuestionsForActivity(activity.id));
  }
  if (stage === 1) {
    return uniqueQuestions([
      ...modules.getStage1CalibratedQuestions({
        track: activity.track,
        levelId: activity.levelId,
        half: activity.half,
        activityId: activity.id,
      }),
      ...modules.getMissingStage1ReplacementQuestionsForActivity(activity.id),
    ]);
  }
  if (stage === 2) return uniqueQuestions(modules.getStage2CalibratedQuestions(activity.id));
  if (stage === 3) return uniqueQuestions(modules.getStage3CalibratedQuestions(activity.id));
  // Stage 4 and later are not currently accepted learner-facing stages and
  // are deliberately excluded. Revisit only when those stages are approved.
  return [];
}

function exportReasoningKeys() {
  const modules = getReasoningRuntimeModules();
  const activityList = [
    ...modules.getActivities(),
    ...modules.level2Activities,
  ];
  const activities = [];
  const seen = new Set();
  for (const activity of activityList) {
    if (!activity?.id || seen.has(activity.id)) continue;
    seen.add(activity.id);
    const stage = Number(String(activity.stageId || '').replace('S', '')) || 1;
    const isPublishedScope =
      (activity.levelId === 'L1' && stage >= 1 && stage <= 3) ||
      (activity.levelId === 'L2' && stage === 1);
    if (isPublishedScope) activities.push(activity);
  }

  const entries = [];
  const issues = [];
  const sources = [];
  for (const activity of activities) {
    let questions;
    try {
      questions = resolveReasoningQuestions(activity, modules);
    } catch (error) {
      issues.push({ product: 'reasoning', activityId: activity.id, issue: `runtime question resolution failed: ${error.message}` });
      continue;
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      issues.push({ product: 'reasoning', activityId: activity.id, issue: 'the published activity resolves to no runtime questions' });
      continue;
    }

    sources.push({
      product: 'reasoning',
      family: 'calibrated-runtime',
      sourceFile: 'src/pages/Reasoning/Activity/[activityId].js',
      activityId: activity.id,
      levelId: activity.levelId,
      stageId: activity.stageId,
      questionCount: questions.length,
    });

    questions.forEach((question, index) => {
      if (!question?.id || typeof question.answer !== 'string' || !Array.isArray(question.options) ||
          question.options.length < 2 || !question.options.includes(question.answer)) {
        issues.push({
          product: 'reasoning',
          activityId: activity.id,
          questionId: question?.id ?? null,
          issue: 'runtime question must have a stable id, correct answer, and options containing that answer',
        });
        return;
      }
      const keyId = `reasoning:${activity.id}:${question.id}`;
      entries.push({
        keyId,
        product: 'reasoning',
        family: 'calibrated-runtime',
        sourceFile: 'src/pages/Reasoning/Activity/[activityId].js',
        sourceFingerprint: `sha256:${sha256(JSON.stringify(question))}`,
        activityId: activity.id,
        questionId: String(question.id),
        questionIndex: index + 1,
        levelId: activity.levelId,
        stageId: activity.stageId,
        track: activity.track,
        half: activity.half,
        questionType: question.questionType || 'multiple_choice',
        gradingRule: 'reasoning-exact-option',
        answerKey: {
          correctAnswer: question.answer,
          acceptedResponses: cloneData(question.options),
          explanation: typeof question.explanation === 'string' ? question.explanation : '',
        },
      });
    });
  }
  return { entries, sources, issues };
}

function main() {
  if (!fs.existsSync(frontendRoot)) {
    throw new Error(`Frontend repository not found at ${frontendRoot}. Set FRONTEND_REPO_PATH if needed.`);
  }
  const sourceRevision = gitValue(['rev-parse', 'HEAD']);
  const sourceBranch = gitValue(['rev-parse', '--abbrev-ref', 'HEAD']);
  if (!sourceRevision || !sourceBranch) {
    throw new Error('The frontend source must be a Git checkout so the export can record the exact source revision.');
  }

  registerFrontendJsLoader();

  const foreign = exportForeignLanguageKeys();
  const reasoning = exportReasoningKeys();
  const entries = [...foreign.entries, ...reasoning.entries].sort((a, b) => a.keyId.localeCompare(b.keyId));
  const issues = [...foreign.issues, ...reasoning.issues];
  const duplicates = new Set();
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.keyId)) duplicates.add(entry.keyId);
    seen.add(entry.keyId);
  }
  for (const keyId of duplicates) {
    issues.push({ issue: `duplicate generated keyId: ${keyId}` });
  }

  const audit = {
    generatedAt: new Date().toISOString(),
    frontendRoot,
    sourceRevision,
    sourceBranch,
    sourceFiles: foreign.sources,
    reasoningRuntimeSources: reasoning.sources,
    counts: {
      foreignLanguageEntries: foreign.entries.length,
      reasoningEntries: reasoning.entries.length,
      totalEntries: entries.length,
      sourceFiles: foreign.sources.length,
      reasoningActivities: reasoning.sources.length,
      unresolvedIssues: issues.length,
    },
    issues,
  };

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(auditPath, JSON.stringify(audit, null, 2) + '\n', 'utf8');

  if (issues.length) {
    fs.rmSync(manifestPath, { force: true });
    console.error(`Answer-key export blocked: ${issues.length} unresolved issue(s).`);
    console.error(`Read the report: ${auditPath}`);
    for (const issue of issues.slice(0, 20)) {
      console.error(`- ${issue.sourceFile || issue.activityId || issue.keyId || 'source'}: ${issue.issue}`);
    }
    if (issues.length > 20) console.error(`- ${issues.length - 20} additional issue(s) are in the report.`);
    process.exitCode = 1;
    return;
  }

  const manifest = {
    schemaVersion: 1,
    generatedAt: audit.generatedAt,
    sourceRevision,
    sourceBranch,
    counts: audit.counts,
    entries,
  };

  const registry = require(path.join(backendRoot, 'grading', 'answerKeyRegistry.js'));
  const validation = registry.validateAnswerKeyManifest(manifest);
  if (!validation.valid) {
    fs.rmSync(manifestPath, { force: true });
    console.error('Generated manifest failed schema validation:');
    validation.errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Secure grading answer-key export passed.');
  console.log(`  Foreign Languages keys: ${foreign.entries.length}`);
  console.log(`  Reasoning keys: ${reasoning.entries.length}`);
  console.log(`  Total server-only keys: ${entries.length}`);
  console.log(`  Manifest: ${manifestPath}`);
  console.log('The manifest is written only under the Backend repository and is not imported by the frontend.');
}

try {
  main();
} catch (error) {
  console.error(`Secure grading answer-key export failed: ${error.stack || error.message}`);
  process.exitCode = 1;
}
