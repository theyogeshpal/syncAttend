const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

router.get('/teachers', adminController.getAllTeachers);
router.delete('/teacher/:id', adminController.deleteTeacher);
router.delete('/student/:id', adminController.deleteStudent);
router.get('/batches', adminController.getAllBatches);

module.exports = router;
