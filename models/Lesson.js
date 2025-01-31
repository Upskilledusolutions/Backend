const mongoose = require('mongoose');

// Create dynamic schema for lessons
const createLessonModel = (language) => {
  const lessonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    level: { type: String, required: true },
    pdf: { type: String, required: true },
    video: { type: String, required: true },
    desc: { type: String, required: true },
  });

  // Normalize language string (replace spaces with underscores, lowercase)
  const collectionName = language.toLowerCase().replace(/ /g, '_');

  // Dynamically create model based on the language, with the specified collection name
  return mongoose.model(language, lessonSchema, collectionName);
};

module.exports = createLessonModel;
