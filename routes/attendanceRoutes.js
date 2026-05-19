const express = require('express');
const router = express.Router();
const { startClassSession, endClassSession, markStudentPresence, getAttendanceByBatch, getStudentAttendance } = require('../controllers/attendanceController');
const { createBatch, getTeacherBatches, getStudentBatches, getStudentsByFilter } = require('../controllers/batchController');

router.post('/start-session', startClassSession);
router.post('/end-session', endClassSession);
router.post('/mark-present', markStudentPresence);
router.get('/records/:batchId', getAttendanceByBatch);
router.get('/student/:studentId', getStudentAttendance);

router.post('/batch/create', createBatch);
router.get('/batch/teacher/:teacherId', getTeacherBatches);
router.get('/batch/student/:studentId', getStudentBatches);
router.get('/batch/students/filter', getStudentsByFilter);

module.exports = router;