const express = require('express');
const router = express.Router();
const lessonController = require('../controllers/lessonController');

// CRUD routes, with dynamic language parameter
router.post('/:language', lessonController.createLesson);
router.get('/:language', lessonController.getAllLessons);
router.get('/:language/:id', lessonController.getLessonById);
router.put('/:language/:id', lessonController.updateLesson);
router.delete('/:language/:id', lessonController.deleteLesson);

module.exports = router;
