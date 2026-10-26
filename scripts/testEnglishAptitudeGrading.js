const assert = require('node:assert/strict');
const answers = require('../data/englishAptitudeL1S1StoryAnswers');
const { gradeEnglishAptitudeSingleSelect } = require('../utils/englishAptitudeGrading');

assert.equal(answers.length, 16, 'Only the 16 single-select items in the preview activity are gradeable.');
for (const question of answers) {
  assert.equal(question.activityId, 'ENG-L1-S1-EXP-01');
  assert.equal(question.options.includes(question.answer), true);
  const correct = gradeEnglishAptitudeSingleSelect({
    activityId: question.activityId,
    questionId: question.questionId,
    selectedAnswer: question.answer,
  });
  assert.equal(correct.ok, true);
  assert.equal(correct.result.isCorrect, true);
  assert.equal('answer' in correct.result, false, 'Never return the answer key.');
  assert.equal(correct.result.explanation, question.explanation);

  const wrongOption = question.options.find(option => option !== question.answer);
  const wrong = gradeEnglishAptitudeSingleSelect({
    activityId: question.activityId,
    questionId: question.questionId,
    selectedAnswer: wrongOption,
  });
  assert.equal(wrong.ok, true);
  assert.equal(wrong.result.isCorrect, false);
  assert.equal('explanation' in wrong.result, false, 'Do not disclose explanations/answers on an incorrect submission.');
}
assert.equal(gradeEnglishAptitudeSingleSelect({ activityId: 'ENG-L1-S1-EXT-01', questionId: answers[0].questionId, selectedAnswer: answers[0].answer }).status, 404);
assert.equal(gradeEnglishAptitudeSingleSelect({ activityId: answers[0].activityId, questionId: 'unknown-question', selectedAnswer: 'A' }).status, 404);
assert.equal(gradeEnglishAptitudeSingleSelect({ activityId: answers[0].activityId, questionId: answers[0].questionId, selectedAnswer: 'invented answer' }).status, 400);
assert.equal(gradeEnglishAptitudeSingleSelect({ activityId: answers[0].activityId, questionId: answers[0].questionId, selectedAnswer: '' }).status, 400);
assert.equal(gradeEnglishAptitudeSingleSelect({}).status, 400);
console.log('English Aptitude server-side grading tests passed: 16 allowlisted questions, server-owned answer keys, correct/incorrect feedback, no answer-key leakage, and invalid/mismatched request rejection.');
