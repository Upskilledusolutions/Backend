const mongoose = require('mongoose');

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

const AuthSchema = new mongoose.Schema({
  userId: String,
  password: String,
  name: String,
  trial: Boolean,
  type: String,
  next: [],
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
}, { collection: 'users' }); // Ensure this is the correct collection name

const lessonSchema = new mongoose.Schema({
  id: String,
  name: String,
  level: String,
  pdf: String,
  video: String,
  desc: String,
});

const conversationSchema = new mongoose.Schema({
  id: String,
  url: String,
  youtube: String,
  title: String,
  desc: String,
});

const readingSchema = new mongoose.Schema({
  id: String,
  name: String,
  level: String,
  Title: String,
  readingText: String,
  questions: [{question:String, choices: [String], correctAnswer: Number,}]});

const ReadingPSchema = new mongoose.Schema({
  id: String,
  name: String,
  level: String,
  readingText: String,
})

const WritingSchema = new mongoose.Schema({
  id: String,
  name: String,
  level: String,
  firstsent: [String],
})

const listeningSchema = new mongoose.Schema({
  id: String,
  name: String,
  level: String,
  audios: [String],
  questions: [{question:String, choices: [String], correctAnswer: Number,}]});

const exerciseSchema = new mongoose.Schema({
  quiz: String,
  name: String,
  level: String,
  topic: String,
  questions: [{question:String, choices: [String], 
      type: { type: String, required: true, enum: ['MCQs', 'FillInTheBlanks', 'MatchTheFollowing'] },
      correctAnswer: Number,
      pairs: [
        {
          left: { word: String, rightId: Number },
          right: { word: String, rightId: Number }
        }
      ]
    }
  ]
});

const PracticeSchema = new mongoose.Schema({
  quiz: String,
  name: String,
  level: String,
  topic: String,
  questions: [{question:String, choices: [String], 
      type: { type: String, required: true, enum: ['MCQs', 'FillInTheBlanks', 'JumbledWords' ,'MatchTheFollowing'] },
      correctAnswer: Number,
      pairs: [
        {
          left: { word: String, rightId: Number },
          right: { word: String, rightId: Number }
        }
      ]
    }
  ]
});

const QuestionSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  question: { type: String, required: true },
  user: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 },
  likedBy: [{ type: String }], // Array of user IDs who liked the post
  replies: [
    {
      user: { type: String, required: true },
      reply: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const registrationSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  city: String,
  country: String,
  age: Number,
  contest: String,
  subcategory: String,
  amount: Number,
  validTill: String,
  receipt: String,
  userId: String,
  password: String,
}, { timestamps: true });

module.exports = { lessonSchema, conversationSchema, readingSchema, exerciseSchema, listeningSchema, ReadingPSchema, WritingSchema, AuthSchema, PracticeSchema, QuestionSchema, registrationSchema };
