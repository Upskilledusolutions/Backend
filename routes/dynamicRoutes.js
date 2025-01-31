const express = require('express');
const mongoose = require('mongoose'); // Import mongoose
const getDBConnection = require('../config/db');
const getDynamicModel = require('../models/dynamicModel');
const { lessonSchema, conversationSchema, readingSchema, exerciseSchema, listeningSchema, ReadingPSchema, WritingSchema, PracticeSchema, AuthSchema } = require('../models/schemas');
const config = require('config');

const DB_URI = config.get('DB_URI');

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
  Auth :AuthSchema,
};

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
    const documents = await req.model.find();
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
