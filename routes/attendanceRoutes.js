const express = require('express');
const router = express.Router();
const { startClassSession, endClassSession, markStudentPresence, getAttendanceByBatch, getStudentAttendance, getMonthlyAttendance, getStudentBatchStats } = require('../controllers/attendanceController');
const { createBatch, getTeacherBatches, getStudentBatches, getStudentsByFilter, deleteBatch, removeStudentFromBatch, getAllStudents, updateStudentProfile } = require('../controllers/batchController');

router.post('/start-session', startClassSession);
router.post('/end-session', endClassSession);
router.post('/mark-present', markStudentPresence);
router.get('/records/:batchId', getAttendanceByBatch);
router.get('/student/:studentId', getStudentAttendance);
router.get('/monthly/:batchId', getMonthlyAttendance);
router.get('/stats/:studentId/:batchId', getStudentBatchStats);

router.post('/batch/create', createBatch);
router.get('/batch/teacher/:teacherId', getTeacherBatches);
router.get('/batch/student/:studentId', getStudentBatches);
router.get('/batch/students/filter', getStudentsByFilter);
router.get('/batch/students/all', getAllStudents);
router.delete('/batch/:batchId', deleteBatch);
router.delete('/batch/:batchId/student/:studentId', removeStudentFromBatch);
router.put('/student/:studentId/profile', updateStudentProfile);

module.exports = router;