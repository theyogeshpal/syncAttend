const User = require('../models/User');
const bcrypt = require('bcryptjs');

// TEACHER REGISTRATION WITH SECRET KEY SECURITY
exports.registerTeacher = async (req, res) => {
  try {
    const { name, mobile, password, branch, secretKey } = req.body;

    // 1. Secret Key Validation (Change this to whatever master key you want)
    const MASTER_SECRET_KEY = "TYP_CSE_2004"; 
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

    if (!mobile || !password) {
      return res.status(400).json({ message: "Mobile and password are required." });
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

    // --- ANTI-PROXY DEVICE LOCK ENGINE (Students Only) ---
    if (user.role === 'student') {
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
    }

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

// 4. CHANGE PASSWORD FUNCTIONALITY
exports.changePassword = async (req, res) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    if (!userId || !oldPassword || !newPassword) {
      return res.status(400).json({ message: "User ID, old password, and new password are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Verify old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password." });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Save
    user.password = hashedNewPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully!" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 5. UPLOAD PROFILE PICTURE
exports.uploadProfilePic = async (req, res) => {
  try {
    const { userId } = req.params;
    const { base64Image } = req.body;
    const user = await User.findByIdAndUpdate(userId, { profilePic: base64Image }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ message: 'Profile picture updated successfully', profilePic: user.profilePic });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// UPDATE TEACHER PROFILE
exports.updateTeacherProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, mobile, branch } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    if (branch) user.branch = branch;
    await user.save();
    res.status(200).json({ message: 'Profile updated successfully', data: user });
  } catch (error) { res.status(500).json({ error: error.message }); }
};

// 6. UPDATE OR SEED SUPERADMIN WITH CUSTOM CREDENTIALS
exports.updateSuperadmin = async (req, res) => {
  try {
    const { mobile, password } = req.body;
    if (!mobile || !password) {
      return res.status(400).json({ message: 'Mobile and password are required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    let superadmin = await User.findOne({ role: 'superadmin' });
    
    if (superadmin) {
      superadmin.mobile = mobile;
      superadmin.password = hashedPassword;
      await superadmin.save();
      return res.status(200).json({ message: 'Superadmin credentials updated successfully' });
    } else {
      superadmin = new User({
        name: 'Super Admin',
        mobile: mobile,
        password: hashedPassword,
        role: 'superadmin'
      });
      await superadmin.save();
      return res.status(201).json({ message: 'Superadmin created successfully' });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
};