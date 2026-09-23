const mongoose = require('mongoose');
const getDBConnection = require('../config/db.js');

const reasoningQuestionAttemptSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  activityAttemptId: { type: String, required: true, maxlength: 128 },
  questionId: { type: String, required: true, maxlength: 160 },
  track: { type: String, required: true, enum: ['quantitative', 'verbal'] },
  levelId: { type: String, required: true, enum: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9'] },
  stageId: { type: String, required: true, enum: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] },
  half: { type: String, required: true, enum: ['explore', 'extend'] },
  activityId: { type: String, required: true, maxlength: 160 },
  moduleId: { type: String, required: true, maxlength: 160 },
  topicId: { type: String, maxlength: 160 },
  concept: { type: String, maxlength: 200 },
  questionType: { type: String, maxlength: 100 },
  contentMode: { type: String, maxlength: 100 },
  difficulty: { type: String, maxlength: 50 },
  selectedAnswer: { type: String, maxlength: 2000 },
  correctAnswer: { type: String, maxlength: 2000 },
  isCorrect: { type: Boolean, default: null },
  responseStatus: { type: String, required: true, enum: ['answered', 'expired'] },
  timeLimitSeconds: { type: Number, required: true, min: 1, max: 3600 },
  responseTimeSeconds: { type: Number, required: true, min: 0, max: 3600 },
  recordedAt: { type: Date, default: Date.now },
}, {
  collection: 'question_attempts',
  timestamps: true,
});

reasoningQuestionAttemptSchema.index(
  { userId: 1, activityAttemptId: 1, questionId: 1 },
  { unique: true }
);

const reasoningDb = getDBConnection('Reasoning');

module.exports =
  reasoningDb.models.ReasoningQuestionAttempt ||
  reasoningDb.model('ReasoningQuestionAttempt', reasoningQuestionAttemptSchema);
