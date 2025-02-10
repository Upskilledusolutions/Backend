const mongoose = require('mongoose');

const AuthSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },  // Unique and required
  password: { type: String, unique: true, required: true },  // Unique and required
  name: String,
  trial: Boolean,
  using: Boolean,
  active: Boolean,
  type: String,
  next: [String],
},{ timestamps: true });

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

module.exports = { lessonSchema, conversationSchema, readingSchema, exerciseSchema, listeningSchema, ReadingPSchema, WritingSchema, AuthSchema, PracticeSchema };
