const express = require('express');
const router = express.Router();
const { onboardStudent, loginUser, resetStudentDevice } = require('../controllers/authController');

// Define operational REST endpoints
router.post('/onboard', onboardStudent);
router.post('/login', loginUser);
router.put('/reset-device/:studentId', resetStudentDevice);

module.exports = router;