const express = require('express');
const app = require('./app');
const config = require('config');
const mongoose = require('mongoose');

// Environment variables
const PORT = config.get('PORT') || 5000;
const DB_URI = config.get('DB_URI');

// Connect to MongoDB
mongoose
  .connect(DB_URI+'Lessons', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
