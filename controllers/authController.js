const User = require('../models/User');
const bcrypt = require('bcryptjs');

// TEACHER REGISTRATION WITH SECRET KEY SECURITY
exports.registerTeacher = async (req, res) => {
  try {
    const { name, mobile, password, branch, secretKey } = req.body;

    // 1. Secret Key Validation (Change this to whatever master key you want)
    const MASTER_SECRET_KEY = "DIGI_CSE_2026"; 
    if (secretKey !== MASTER_SECRET_KEY) {
      return res.status(403).json({ message: "Invalid Secret Security Key! Unauthorized access." });
    }

    // 2. Check if mobile number already exists
    const userExists = await User.findOne({ mobile });
    if (userExists) {
      return res.status(400).json({ message: "This mobile number is already registered." });
    }

    // 3. Encrypt/Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Save to Database with 'teacher' role
    const newTeacher = new User({
      name,
      mobile,
      password: hashedPassword,
      role: 'teacher',
      deviceId: null, // Teachers don't need a hard locked device restriction
      branch
    });

    await newTeacher.save();
    res.status(201).json({ message: "Teacher account created successfully! You can now login." });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// 1. GLOBAL STUDENT ONBOARDING (Executed by Teachers)
exports.onboardStudent = async (req, res) => {
  try {
    const { name, mobile, branch, year, session } = req.body;

    // Validate parameters
    if (!name || !mobile) {
      return res.status(400).json({ message: "Name and mobile number are required fields." });
    }

    // Check if student already exists in the system database
    const userExists = await User.findOne({ mobile });
    if (userExists) {
      return res.status(400).json({ message: "A user with this mobile number is already registered globally." });
    }

    // Hash the custom default password pattern: student@mobile
    const defaultPassword = `student@${mobile}`;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Save to global pool
    const newStudent = new User({
      name,
      mobile,
      password: hashedPassword,
      role: 'student',
      branch,
      year,
      session
    });

    await newStudent.save();
    res.status(201).json({ 
      message: "Student profile onboarded globally successfully!", 
      loginId: mobile, 
      defaultPassword 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. SECURE STUDENT LOGIN WITH HARDWARE DEVICE LOCK LOGIC
exports.loginUser = async (req, res) => {
  try {
    const { mobile, password, deviceId } = req.body;

    if (!mobile || !password || !deviceId) {
      return res.status(400).json({ message: "All parameters (mobile, password, deviceId) are required." });
    }

    // Find user record
    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({ message: "Invalid credentials. User not found." });
    }

    // Match hashed password password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials. Incorrect password." });
    }

    // --- ANTI-PROXY DEVICE LOCK ENGINE ---
    
    // CASE A: Student logging in for the very first time (deviceId is null in DB)
    if (!user.deviceId) {
      // Rule verification: Ensure NO OTHER student has already bound this specific phone device asset ID
      const deviceAlreadyClaimed = await User.findOne({ deviceId, role: 'student' });
      if (deviceAlreadyClaimed) {
        return res.status(400).json({ 
          message: "Security Flag: Two students cannot log in using the same physical device smartphone asset." 
        });
      }

      // Safe to bind this device permanently to this student account
      user.deviceId = deviceId;
      await user.save();
      console.log(`🔒 Device Fingerprint successfully bound to Student: ${user.name}`);
    } 
    
    // CASE B: Subsequent Logins (Compare incoming signature hardware key string against database value)
    else if (user.deviceId !== deviceId) {
      return res.status(403).json({ 
        message: "Access Denied: This account is locked to your originally registered smartphone device." 
      });
    }

    // Login successful
    res.status(200).json({
      message: "Login verified successfully!",
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        branch: user.branch,
        year: user.year
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. TEACHER DEVICE RESET COMMAND (Clears out the locked device fingerprint string)
exports.resetStudentDevice = async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Target student record not found." });
    }

    // Wipe deviceId value back to null state
    student.deviceId = null;
    await student.save();

    res.status(200).json({ 
      message: `Device lock footprint cleared for ${student.name}. They can now bind a new device on their next login session.` 
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};