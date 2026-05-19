const express = require('express');
const router = express.Router();
const { startClassSession, endClassSession, markStudentPresence } = require('../controllers/attendanceController');

router.post('/start-session', startClassSession);
router.post('/end-session', endClassSession);
router.post('/mark-present', markStudentPresence);

module.exports = router;