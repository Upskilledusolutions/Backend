const createLessonModel = require('../models/Lesson');

// Create a lesson for a specific language
exports.createLesson = async (req, res, next) => {
  const { language } = req.params; // Language as a parameter
  const Lesson = createLessonModel(language); // Create the model dynamically

  try {
    const lesson = new Lesson(req.body);
    await lesson.save();
    res.status(201).json(lesson);
  } catch (error) {
    next(error);
  }
};

// Get all lessons for a specific language
exports.getAllLessons = async (req, res, next) => {
  const { language } = req.params; // Language as a parameter
  const Lesson = createLessonModel(language); // Create the model dynamically

  try {
    const lessons = await Lesson.find();
    res.json(lessons);
  } catch (error) {
    next(error);
  }
};

// Get a single lesson by ID for a specific language
exports.getLessonById = async (req, res, next) => {
  const { language, id } = req.params; // Language and ID as parameters
  const Lesson = createLessonModel(language); // Create the model dynamically

  try {
    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json(lesson);
  } catch (error) {
    next(error);
  }
};

// Update a lesson by ID for a specific language
exports.updateLesson = async (req, res, next) => {
  const { language, id } = req.params; // Language and ID as parameters
  const Lesson = createLessonModel(language); // Create the model dynamically

  try {
    const lesson = await Lesson.findByIdAndUpdate(id, req.body, { new: true });
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json(lesson);
  } catch (error) {
    next(error);
  }
};

// Delete a lesson by ID for a specific language
exports.deleteLesson = async (req, res, next) => {
  const { language, id } = req.params; // Language and ID as parameters
  const Lesson = createLessonModel(language); // Create the model dynamically

  try {
    const lesson = await Lesson.findByIdAndDelete(id);
    if (!lesson) return res.status(404).json({ message: 'Lesson not found' });
    res.json({ message: 'Lesson deleted' });
  } catch (error) {
    next(error);
  }
};
