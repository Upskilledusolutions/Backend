const express = require('express');
const { requireAuth } = require('../middlewares/auth');
const { gradeEnglishAptitudeSingleSelect } = require('../utils/englishAptitudeGrading');

const router = express.Router();

// Keep disabled until the backend feature branch is reviewed, deployed deliberately,
// and the frontend no longer bundles draft answer keys.
router.post('/grade', requireAuth, (req, res) => {
  if (process.env.ENGLISH_APTITUDE_PREVIEW_ENABLED !== 'true') {
    return res.status(503).json({ success: false, message: 'English Aptitude preview grading is not enabled.' });
  }

  const result = gradeEnglishAptitudeSingleSelect(req.body || {});
  if (!result.ok) {
    return res.status(result.status).json({ success: false, message: result.message });
  }
  return res.status(200).json({ success: true, ...result.result });
});

module.exports = router;
