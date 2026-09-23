const express = require('express');
const ReasoningQuestionAttempt = require('../models/ReasoningQuestionAttempt');
const { requireAuth } = require('../middlewares/auth');

const router = express.Router();

const VALID_TRACKS = new Set(['quantitative', 'verbal']);
const VALID_LEVELS = new Set(['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9']);
const VALID_STAGES = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'S6']);
const VALID_HALVES = new Set(['explore', 'extend']);
const VALID_RESPONSE_STATUSES = new Set(['answered', 'expired']);

const stringField = (value, maxLength, required = false) => {
  if (value === undefined || value === null || value === '') {
    return required ? null : undefined;
  }
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) return null;
  return normalized;
};

const numericField = (value, min, max, required = false) => {
  if (value === undefined || value === null || value === '') {
    return required ? null : undefined;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
};

router.post('/attempts', requireAuth, async (req, res) => {
  try {
    const body = req.body || {};
    const activityAttemptId = stringField(body.activityAttemptId, 128, true);
    const questionId = stringField(body.questionId, 160, true);
    const activityId = stringField(body.activityId, 160, true);
    const moduleId = stringField(body.moduleId, 160, true);
    const topicId = stringField(body.topicId, 160);
    const concept = stringField(body.concept, 200);
    const questionType = stringField(body.questionType, 100);
    const contentMode = stringField(body.contentMode, 100);
    const difficulty = stringField(body.difficulty, 50);
    const track = stringField(body.track, 40, true);
    const levelId = stringField(body.levelId, 10, true);
    const stageId = stringField(body.stageId, 10, true);
    const half = stringField(body.half, 20, true);
    const responseStatus = stringField(body.responseStatus, 20, true);
    const selectedAnswer = stringField(body.selectedAnswer, 2000);
    const correctAnswer = stringField(body.correctAnswer, 2000);
    const timeLimitSeconds = numericField(body.timeLimitSeconds, 1, 3600, true);
    const responseTimeSeconds = numericField(body.responseTimeSeconds, 0, 3600, true);

    if (
      !activityAttemptId ||
      !questionId ||
      !activityId ||
      !moduleId ||
      !track ||
      !levelId ||
      !stageId ||
      !half ||
      !responseStatus ||
      timeLimitSeconds === null ||
      responseTimeSeconds === null
    ) {
      return res.status(400).json({ success: false, message: 'Invalid Reasoning question-attempt data' });
    }

    if (
      !VALID_TRACKS.has(track) ||
      !VALID_LEVELS.has(levelId) ||
      !VALID_STAGES.has(stageId) ||
      !VALID_HALVES.has(half) ||
      !VALID_RESPONSE_STATUSES.has(responseStatus)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid Reasoning question-attempt metadata' });
    }

    const allowedLevels = Array.isArray(req.authUser.reasoningAccess)
      ? req.authUser.reasoningAccess
      : [];
    if (!allowedLevels.includes(`reasoning${levelId}`)) {
      return res.status(403).json({ success: false, message: 'Reasoning Level access is not enabled' });
    }

    if (responseStatus === 'answered' && typeof body.isCorrect !== 'boolean') {
      return res.status(400).json({ success: false, message: 'Answered attempts require a boolean correctness value' });
    }

    if (responseStatus === 'expired' && body.isCorrect !== undefined && body.isCorrect !== null) {
      return res.status(400).json({ success: false, message: 'Expired attempts cannot include a correctness value' });
    }

    const payload = {
      userId: req.authUser.userId,
      activityAttemptId,
      questionId,
      track,
      levelId,
      stageId,
      half,
      activityId,
      moduleId,
      topicId,
      concept,
      questionType,
      contentMode,
      difficulty,
      selectedAnswer,
      correctAnswer,
      isCorrect: responseStatus === 'answered' ? body.isCorrect : null,
      responseStatus,
      timeLimitSeconds,
      responseTimeSeconds: Math.min(responseTimeSeconds, timeLimitSeconds),
      recordedAt: new Date(),
    };

    const attempt = await ReasoningQuestionAttempt.findOneAndUpdate(
      {
        userId: req.authUser.userId,
        activityAttemptId,
        questionId,
      },
      { $set: payload },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    ).lean();

    return res.status(200).json({ success: true, attempt });
  } catch (error) {
    console.error('Error persisting Reasoning question attempt:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/attempts', requireAuth, async (req, res) => {
  try {
    const filters = { userId: req.authUser.userId };

    const activityAttemptId = stringField(req.query.activityAttemptId, 128);
    const track = stringField(req.query.track, 40);
    const levelId = stringField(req.query.levelId, 10);
    const stageId = stringField(req.query.stageId, 10);
    const half = stringField(req.query.half, 20);
    const activityId = stringField(req.query.activityId, 160);

    if (activityAttemptId !== undefined && activityAttemptId === null) {
      return res.status(400).json({ success: false, message: 'Invalid activityAttemptId filter' });
    }
    if (track !== undefined && (!track || !VALID_TRACKS.has(track))) {
      return res.status(400).json({ success: false, message: 'Invalid track filter' });
    }
    if (levelId !== undefined && (!levelId || !VALID_LEVELS.has(levelId))) {
      return res.status(400).json({ success: false, message: 'Invalid levelId filter' });
    }
    if (stageId !== undefined && (!stageId || !VALID_STAGES.has(stageId))) {
      return res.status(400).json({ success: false, message: 'Invalid stageId filter' });
    }
    if (half !== undefined && (!half || !VALID_HALVES.has(half))) {
      return res.status(400).json({ success: false, message: 'Invalid half filter' });
    }
    if (activityId !== undefined && activityId === null) {
      return res.status(400).json({ success: false, message: 'Invalid activityId filter' });
    }

    if (activityAttemptId) filters.activityAttemptId = activityAttemptId;
    if (track) filters.track = track;
    if (levelId) filters.levelId = levelId;
    if (stageId) filters.stageId = stageId;
    if (half) filters.half = half;
    if (activityId) filters.activityId = activityId;

    const requestedLimit = Number(req.query.limit);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(200, Math.max(1, Math.floor(requestedLimit)))
      : 100;

    const attempts = await ReasoningQuestionAttempt
      .find(filters)
      .sort({ recordedAt: 1 })
      .limit(limit)
      .select('-correctAnswer')
      .lean();

    return res.status(200).json({
      success: true,
      count: attempts.length,
      attempts,
    });
  } catch (error) {
    console.error('Error reading Reasoning question attempts:', error.message);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
