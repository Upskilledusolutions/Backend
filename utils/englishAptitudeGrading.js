const answerKey = require("../data/englishAptitudeL1S1StoryAnswers");

const byQuestionId = new Map(answerKey.map(question => [question.questionId, question]));

function gradeEnglishAptitudeSingleSelect({ activityId, questionId, selectedAnswer }) {
  if (typeof activityId !== "string" || typeof questionId !== "string" || typeof selectedAnswer !== "string") {
    return { ok: false, status: 400, message: "activityId, questionId and selectedAnswer are required strings." };
  }
  if (activityId.length > 160 || questionId.length > 160 || selectedAnswer.length > 2000 || !selectedAnswer.trim()) {
    return { ok: false, status: 400, message: "Invalid answer submission." };
  }
  const question = byQuestionId.get(questionId);
  if (!question || question.activityId !== activityId) {
    return { ok: false, status: 404, message: "Question is not available for this activity." };
  }
  if (!question.options.includes(selectedAnswer)) {
    return { ok: false, status: 400, message: "Selected answer is not one of this question's options." };
  }
  const isCorrect = selectedAnswer === question.answer;
  return {
    ok: true,
    result: {
      questionId: question.questionId,
      activityId: question.activityId,
      isCorrect,
      feedback: isCorrect ? question.feedbackCorrect : question.feedbackIncorrect,
      ...(isCorrect ? { explanation: question.explanation } : {}),
    },
  };
}

module.exports = { gradeEnglishAptitudeSingleSelect };
