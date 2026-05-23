const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { onboardStudent, loginUser, resetStudentDevice, changePassword } = require('../controllers/authController');
const { login, registerTeacher } = require('../controllers/authController');

// Define operational REST endpoints
router.post('/onboard', onboardStudent);
router.post('/login', loginUser);
router.put('/reset-device/:studentId', resetStudentDevice);
router.post('/register-teacher', registerTeacher);
router.put('/change-password', changePassword);
router.put('/profile-pic/:userId', authController.uploadProfilePic);
router.post('/seed-superadmin', authController.seedSuperadmin);

module.exports = router;