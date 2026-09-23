const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
require('dotenv').config();
const getDBConnection = require('../config/db');
const getDynamicModel = require('../models/dynamicModel');
const { lessonSchema, conversationSchema, readingSchema, exerciseSchema, listeningSchema, ReadingPSchema, WritingSchema, PracticeSchema, QuestionSchema, AuthSchema } = require('../models/schemas');
const { authSchema } = require('../models/Authmodel'); // Import the Auth model

const DB_URI = process.env.DB_URI

const router = express.Router();
 
// Map for selecting schema based on database
const schemaMap = {
  Lessons: lessonSchema,
  Conversations: conversationSchema,
  Reading: readingSchema,
  Exercises: exerciseSchema,
  Listening: listeningSchema,
  ReadingP: ReadingPSchema,
  Writing: WritingSchema,
  PracticeTest: PracticeSchema,
  Auth: AuthSchema,
};

router.post('/login', async (req, res) => {
  const { name, userId, password, ipAddress, location } = req.body;

  try {
    // Find the user in the database
    const authDB = getDBConnection('Auth');
    const AuthModel = authDB.model('Auth', authSchema);

    const user = await AuthModel.findOne({ userId, password });

    if (user) {
            // Explicitly check if the name matches
            if (user.name !== name) {
              return res.status(401).json({ success: false, message: 'Invalid name' });
            }
      // Add the new login details to the loginHistory array
      user.loginHistory.push({
        ip: ipAddress || 'Unknown',
        location: location || 'Unknown',
        timestamp: new Date(),
      });

      // Keep only the last 3 entries in the loginHistory array
      if (user.loginHistory.length > 3) {
        user.loginHistory = user.loginHistory.slice(-3);
      }

      // Save the updated user document
      await user.save();

      res.status(200).json({
        success: true,
        message: 'Login successful',
        user,
      });
    } else {
      // If user is not found, return an error
      res.status(401).json({ success: false, message: 'Invalid user ID or password' });
    }
  } catch (error) {
    console.error('Error during login:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

module.exports = router;

router.get('/users/totalScores', async (req, res) => {
  try {
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const usersWithScores = await AuthModel.find(
      { "performance.totalScore": { $exists: true, $ne: null } }, // Ensure totalScore exists and is not null
      { userId: 1, name: 1, "performance.totalScore": 1, _id: 0, active: 1, contest: 1 } // Project userId, name, and totalScore
    );

    res.status(200).json({ success: true, users: usersWithScores });
  } catch (error) {
    console.error('Error fetching totalScores:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/reasoning/access/:userId', async (req, res) => {
  try {
    const authDB = getDBConnection('Auth');
    const AuthModel = authDB.model('Auth', authSchema);
    const user = await AuthModel.findOne(
      { userId: req.params.userId },
      { userId: 1, reasoningAccess: 1, _id: 0 }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      userId: user.userId,
      reasoningAccess: user.reasoningAccess || ['reasoningL1'],
    });
  } catch (error) {
    console.error('Error fetching Reasoning access:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/completed-quizzes', async (req, res) => {
  const { userId, completedQuizzes } = req.body;
  try {
        // Find the user in the database
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const user = await AuthModel.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Helper function that ensures questionTypes is an array
    const normalizeQuestionTypes = (qt) => {
      return Array.isArray(qt) ? qt : [qt];
    };

    // Helper function to merge a new quiz object into the user's completedQuizzes
    const mergeQuiz = (newQuiz) => {
      // Coerce exercise and language to strings for reliable comparison
      const newExercise = String(newQuiz.exercise);
      const newLanguage = String(newQuiz.language);
      const newTypes = normalizeQuestionTypes(newQuiz.questionTypes);

      // Find an existing entry with matching exercise and language
      const existingQuiz = user.completedQuizzes.find(q => 
        String(q.exercise) === newExercise && String(q.language) === newLanguage
      );
      
      if (existingQuiz) {
        // Add any new question types that aren't already present
        newTypes.forEach(qt => {
          if (!existingQuiz.questionTypes.includes(qt)) {
            existingQuiz.questionTypes.push(qt);
          }
        });
      } else {
        // Otherwise, add the new quiz object (ensuring questionTypes is an array)
        user.completedQuizzes.push({
          exercise: newQuiz.exercise,
          language: newQuiz.language,
          questionTypes: newTypes,
        });
      }
    };

    // Determine if completedQuizzes is a single object or an array of objects
    if (!Array.isArray(completedQuizzes)) {
      mergeQuiz(completedQuizzes);
    } else {
      completedQuizzes.forEach(quiz => mergeQuiz(quiz));
    }
    
    await user.save();
    res.json({ message: 'Completed quizzes updated', completedQuizzes: user.completedQuizzes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:userId/performance', async (req, res) => {
  const { userId } = req.params;
  try {
    // Only select the performance field and exclude _id
        // Find the user in the database
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const userPerformance = await AuthModel.findOne(
      { userId },
      { performance: 1, _id: 0 }
    );
    
    if (!userPerformance || !userPerformance.performance) {
      return res.status(404).json({ error: "User performance not found" });
    }
    
    res.json(userPerformance.performance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:userId/scores', async (req, res) => {
  const { userId } = req.params;
  try {
        // Find the user in the database
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const user = await AuthModel.findOne({ userId }, { performance: 1, _id: 0 });
    if (!user || !user.performance) {
      return res.status(404).json({ error: 'User performance not found' });
    }

    const { dailyScores, weeklyScores, monthlyScores } = user.performance;
    res.json({ success: true, dailyScores, weeklyScores, monthlyScores });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper function to compare two arrays (order-insensitive)
const arraysEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  const sortedA = a.slice().sort();
  const sortedB = b.slice().sort();
  return sortedA.every((val, index) => val === sortedB[index]);
};

// POST /api/auth/updateScore
router.post('/updateScore', async (req, res) => {
  let { userId, points, exercise, language, questionTypes } = req.body;
  try {
        // Find the user in the database
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const user = await AuthModel.findOne({ userId });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure performance exists
    if (!user.performance) {
      user.performance = { totalScore: 0, dailyScores: {}, weeklyScores: {}, monthlyScores: {}, completedExercises: [] };
    }

    // Convert and sanitize data types
    const newScore = Number(points);
    const exerciseNum = Number(exercise);
    const qTypes = Array.isArray(questionTypes) ? questionTypes : [questionTypes];

    // Get current date, week, and month
    const today = new Date();
    const dateKey = today.toISOString().split('T')[0]; // e.g., "2025-04-07"
    const weekKey = `${today.getFullYear()}-W${Math.ceil(today.getDate() / 7)}`; // e.g., "2025-W15"
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`; // e.g., "2025-04"

    // Check if the exercise already exists
    const existingExercise = user.performance.completedExercises.find(
      (ex) => ex.exercise === exerciseNum && ex.language === language && arraysEqual(ex.questionTypes, qTypes)
    );

    let scoreToAdd = newScore; // Default to the original score
    let isFirstExerciseOfDay = false;

    if (existingExercise) {
      // If the exercise exists, calculate 50% of the new score
      const halfScore = Math.floor(newScore * 0.5);

      // Only update if the 50% score is greater than the existing score
      if (halfScore > existingExercise.score) {
        const scoreDifference = halfScore - existingExercise.score;

        // Update the exercise score
        existingExercise.score = halfScore;

        // Add the difference to the scores
        scoreToAdd = scoreDifference;
      } else {
        scoreToAdd = 0; // No update if the new score is not higher
      }
    } else {
      // If the exercise does not exist, add it to completedExercises
      user.performance.completedExercises.push({
        exercise: exerciseNum,
        language,
        questionTypes: qTypes,
        score: newScore,
        date: today,
      });
    }

    // Check if this is the first exercise of the day
    if (!user.performance.dailyScores.has(dateKey)) {
      isFirstExerciseOfDay = true;
      scoreToAdd += 50; // Add +50 points for the first exercise of the day
    }

    // Update daily, weekly, and monthly scores
    if (scoreToAdd > 0) {
      user.performance.dailyScores.set(
        dateKey,
        (user.performance.dailyScores.get(dateKey) || 0) + scoreToAdd
      );
      user.performance.weeklyScores.set(
        weekKey,
        (user.performance.weeklyScores.get(weekKey) || 0) + scoreToAdd
      );
      user.performance.monthlyScores.set(
        monthKey,
        (user.performance.monthlyScores.get(monthKey) || 0) + scoreToAdd
      );

      // Update totalScore
      user.performance.totalScore += scoreToAdd;
    }

    // Save the updated user
    await user.save();
    res.json({ success: true, performance: user.performance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Optionally, an endpoint to load quizzes when the user logs in:
router.get('/completed-quizzes/:userId', async (req, res) => {
  try {
        // Find the user in the database
        const authDB = getDBConnection('Auth');
        const AuthModel = authDB.model('Auth', authSchema);
    const user = await AuthModel.findOne({ userId: req.params.userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ completedQuizzes: user.completedQuizzes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post("/check-status", async (req, res) => {
  try {
      const { userId } = req.body;

      if (!userId) {
          return res.status(400).json({ success: false, message: "User ID is required" });
      }

          // Connect to the "Auth" database
    const authDB = getDBConnection('Auth');
    const AuthModel = authDB.model('Auth', authSchema);

      // Find user in database
      const user = await AuthModel.findOne({ userId });

      if (!user) {
          return res.status(404).json({ success: false, message: "User not found" });
      }

        return res.status(200).json({ success: true, user: user, message: "User is active" });
      
  } catch (error) {
      console.error("Error checking user status:", error);
      res.status(500).json({ success: false, message: "Internal server error" });
  }
});


// POST: Add a new question
router.post('/questions', async (req, res) => {
  const { topic, question, user } = req.body;

  try {
    if (!topic || !question || !user) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Connect to the "Question" database
    const questionDB = getDBConnection('Question');
    const Question = questionDB.model('Question', QuestionSchema);

    // Create a new question
    const newQuestion = new Question({ topic, question, user });
    await newQuestion.save();

    res.status(201).json({ success: true, message: 'Question added successfully.' });
  } catch (error) {
    console.error('Error adding question:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// GET: Retrieve all questions
router.get('/questions', async (req, res) => {
  try {
    // Connect to the "Question" database
    const questionDB = getDBConnection('Question');
    const Question = questionDB.model('Question', QuestionSchema);

    // Fetch all questions from the database
    const questions = await Question.find().sort({ createdAt: -1 }); // Sort by newest first
    res.status(200).json({ success: true, questions });
  } catch (error) {
    console.error('Error fetching questions:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

router.post('/questions/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // Assume userId is sent in the request body

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Connect to the "Question" database
    const questionDB = getDBConnection('Question');
    const Question = questionDB.model('Question', QuestionSchema);

    // Find the question
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if the user has already liked the post
    if (question.likedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User has already liked this post' });
    }

    // Add the user to the likedBy array and increment the likes count
    question.likedBy.push(userId);
    question.likes += 1;

    // Save the updated question
    await question.save();

    res.status(200).json({ success: true, likes: question.likes });
  } catch (error) {
    console.error('Error liking question:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/questions/:id/unlike', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Connect to the "Question" database
    const questionDB = getDBConnection('Question');
    const Question = questionDB.model('Question', QuestionSchema);

    // Find the question
    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }

    // Check if the user has liked the post
    if (!question.likedBy.includes(userId)) {
      return res.status(400).json({ success: false, message: 'User has not liked this post' });
    }

    // Remove the user from the likedBy array and decrement the likes count
    question.likedBy = question.likedBy.filter((user) => user !== userId);
    question.likes -= 1;

    // Save the updated question
    await question.save();

    res.status(200).json({ success: true, likes: question.likes });
  } catch (error) {
    console.error('Error unliking question:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.post('/questions/:id/reply', async (req, res) => {
  try {
    const { id } = req.params;
    const { user, reply } = req.body;
        // Connect to the "Question" database
    const questionDB = getDBConnection('Question');
    const Question = questionDB.model('Question', QuestionSchema);

    if (!user || !reply) {
      return res.status(400).json({ success: false, message: 'User and reply are required' });
    }

    const question = await Question.findByIdAndUpdate(
      id,
      { $push: { replies: { user, reply, createdAt: new Date() } } }, // Add the reply
      { new: true }
    );
    if (!question) {
      return res.status(404).json({ success: false, message: 'Question not found' });
    }
    res.status(200).json({ success: true, replies: question.replies });
  } catch (error) {
    console.error('Error adding reply:', error.message);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

router.get('/allCollections/:dbName', async (req, res) => {
  const dbName = req.params.dbName.trim(); // Database name from route parameter
  const dbURI = `${DB_URI}${dbName}`; // Dynamic URI

  try {
    if (!dbName) {
      return res.status(400).json({ message: 'Database name is required' });
    }

    // Establish a connection to the specified database
    const dbConnection = mongoose.createConnection(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Wait for the connection to open
    dbConnection.once('open', async () => {
      try {
        // Fetch all collections in the database
        const collections = await dbConnection.db.listCollections().toArray();
        if (collections.length === 0) {
          return res.status(404).json({ message: `No collections found in database: ${dbName}` });
        }

        // Fetch documents from all collections
        const allData = [];
        for (const collection of collections) {
          const data = await dbConnection.collection(collection.name).find().toArray();
          allData.push({ collection: collection.name, items: data });
        }

        // Send all collections and their data
        res.status(200).json(allData);
      } catch (error) {
        res.status(500).json({ message: 'Error fetching collections', error: error.message });
      } finally {
        dbConnection.close(); // Close connection after use
      }
    });

    dbConnection.on('error', (err) => {
      res.status(500).json({ message: 'Database connection error', error: err.message });
    });
  } catch (error) {
    res.status(500).json({ message: 'Error connecting to the database', error: error.message });
  }
});

// Middleware to switch database and get the correct model
router.use('/:dbName/:collection', async (req, res, next) => {
  const { dbName, collection } = req.params;

  try {
    if (!schemaMap[dbName]) {
      return res.status(400).json({ message: 'Invalid database name' });
    }

    const connection = getDBConnection(dbName);
    req.model = getDynamicModel(connection, collection, schemaMap[dbName]);

    next();
  } catch (error) {
    res.status(500).json({ message: 'Error setting up database connection', error: error.message });
  }
});

// CRUD Operations

// Create
router.post('/:dbName/:collection', async (req, res) => {
  try {
    if (!Array.isArray(req.body)) {
      // If it's a single object, convert it to an array
      req.body = [req.body];
    }

    // Use `insertMany()` to handle multiple documents at once
    const documents = await req.model.insertMany(req.body);
    res.status(201).json(documents);
  } catch (error) {
    console.error("Error saving document:", error.message);
    res.status(400).json({ message: error.message });
  }
});

// Read All
router.get('/:dbName/:collection', async (req, res) => {
  try {
    const documents = await req.model.find().sort({ updatedAt: -1 });;
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Read by ID
router.get('/:dbName/:collection/:id', async (req, res) => {
  try {
    const document = await req.model.findById(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update
router.put('/:dbName/:collection/:id', async (req, res) => {
  try {
    const document = await req.model.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json(document);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete
router.delete('/:dbName/:collection/:id', async (req, res) => {
  try {
    const document = await req.model.findByIdAndDelete(req.params.id);
    if (!document) return res.status(404).json({ message: 'Document not found' });
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch All Collections from Lessons Database
router.get('/allCollections', async (req, res) => {
  try {
    const db = mongoose.connection.db; // Get the database instance
    const collections = await db.listCollections().toArray(); // Get the list of collections

    const allLessons = [];
    for (const collection of collections) {
      const lessons = await db.collection(collection.name).find().toArray();
      allLessons.push({ collection: collection.name, lessons });
    }

    res.json(allLessons);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
