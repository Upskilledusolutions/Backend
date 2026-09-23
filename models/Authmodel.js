const mongoose = require('mongoose');
const getDBConnection = require('../config/db.js'); // Ensure correct path
const { REASONING_LEVEL_ACCESS } = require('./schemas');

// Use the 'Auth' database
const authDb = getDBConnection('Auth');

const completedQuizSchema = new mongoose.Schema({
  exercise: { type: Number },
  language: { type: String },
  questionTypes: [{ type: String }],
});

const completedExerciseSchema = new mongoose.Schema({
  exercise: { type: Number },
  language: { type: String },
  questionTypes: [{ type: String }],
  score: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
}, { _id: false });

// The performance schema nests the overall total and an array of completed exercises.
const performanceSchema = new mongoose.Schema({
  totalScore: { type: Number, default: 0 },
  dailyScores: {
    type: Map, // Use a Map to store scores by date (e.g., { "2025-04-07": 100 })
    of: Number,
    default: {},
  },
  weeklyScores: {
    type: Map, // Use a Map to store scores by week (e.g., { "2025-W15": 500 })
    of: Number,
    default: {},
  },
  monthlyScores: {
    type: Map, // Use a Map to store scores by month (e.g., { "2025-04": 2000 })
    of: Number,
    default: {},
  },
  completedExercises: {
    type: [completedExerciseSchema],
    default: [],
  },
}, { _id: false });

const authSchema = new mongoose.Schema({
  userId: String,
  password: String,
  name: String,
  trial: Boolean,
  type: String,
  next: [],
  reasoningAccess: {
    type: [String],
    enum: REASONING_LEVEL_ACCESS,
    default: ['reasoningL1'],
  },
  contest: Boolean,
  active: Boolean,
  using: Boolean,
  loginHistory: {
    type: [
      {
        ip: { type: String, required: true },
        location: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    default: [],
  },
  completedQuizzes: {
    type: [completedQuizSchema],
    default: [],
  },
  performance: {
    type: performanceSchema,
    default: {},
  },
}, { collection: 'users', timestamps: true }); 

module.exports = authDb.model('Auth', authSchema);