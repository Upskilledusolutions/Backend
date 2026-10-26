#!/usr/bin/env node
/**
 * Synchronize the server-only English Aptitude grading key from the editable frontend bank.
 * Run from the Backend repository and pass the source bank path as the first argument.
 * Use --check to verify the checked-in server key matches the editable bank without writing.
 */
const fs = require("node:fs");
const path = require("node:path");

const EXPECTED_ACTIVITY_ID = "ENG-L1-S1-EXP-01";
const EXPECTED_QUESTION_COUNT = 16;
const outputPath = path.join(__dirname, "..", "data", "englishAptitudeL1S1StoryAnswers.js");

function fail(message) {
  console.error(`English Aptitude answer-key sync failed: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const checkOnly = args[0] === "--check";
const sourceArg = checkOnly ? args[1] : args[0];
if (!sourceArg) {
  fail("provide the editable story bank JSON path. Example: npm run sync:english-aptitude-answer-keys -- ..\\Aprioriedunext\\content\\EnglishAptitude\\editable\\L1\\S1\\english-L1-S1-story-01.json");
}

const sourcePath = path.resolve(process.cwd(), sourceArg);
let bank;
try {
  bank = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
} catch (error) {
  fail(`could not read/parse source bank at "${sourcePath}": ${error.message}`);
}

if (!Array.isArray(bank.questions)) fail("source bank must contain a questions array.");

const questions = bank.questions.filter(question =>
  question &&
  question.activityId === EXPECTED_ACTIVITY_ID &&
  question.responseFormat === "single_select"
);

if (questions.length !== EXPECTED_QUESTION_COUNT) {
  fail(`expected ${EXPECTED_QUESTION_COUNT} single-select questions for ${EXPECTED_ACTIVITY_ID}; found ${questions.length}`);
}

const ids = new Set();
const serverQuestions = questions.map(question => {
  if (typeof question.id !== "string" || !question.id.trim() || ids.has(question.id)) {
    fail("question IDs must be non-empty and unique.");
  }
  ids.add(question.id);

  if (!Array.isArray(question.options) || question.options.length < 2 ||
      !Array.isArray(question.answerKey) || question.answerKey.length !== 1 ||
      !question.options.includes(question.answerKey[0])) {
    fail(`question "${question.id}" has invalid options or answerKey.`);
  }
  if (typeof question.feedback?.correct !== "string" ||
      typeof question.feedback?.incorrect !== "string" ||
      typeof question.explanation !== "string") {
    fail(`question "${question.id}" is missing feedback or explanation.`);
  }

  return {
    questionId: question.id,
    activityId: question.activityId,
    options: question.options,
    answer: question.answerKey[0],
    feedbackCorrect: question.feedback.correct,
    feedbackIncorrect: question.feedback.incorrect,
    explanation: question.explanation
  };
});

const generated = `/**
 * Server-only answer key generated from the editable English Aptitude source bank.
 * Do not import this module in the frontend. Regenerate/check it with
 * scripts/syncEnglishAptitudeAnswerKeys.js whenever the editable bank changes.
 */
module.exports = ${JSON.stringify(serverQuestions, null, 2)};
`;

if (checkOnly) {
  let current;
  try {
    current = fs.readFileSync(outputPath, "utf8");
  } catch (error) {
    fail(`could not read generated answer key: ${error.message}`);
  }
  if (current !== generated) {
    fail("the server answer key differs from the editable source bank. Run the sync command to regenerate it.");
  }
  console.log(`English Aptitude answer-key sync check passed: ${questions.length} questions match the editable source bank.`);
} else {
  fs.writeFileSync(outputPath, generated, "utf8");
  console.log(`English Aptitude answer key synchronized: ${questions.length} questions written to ${path.relative(process.cwd(), outputPath)}.`);
}
