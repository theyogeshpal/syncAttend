const Batch = require('../models/Batch');
const User = require('../models/User');

// 1. CREATE BATCH
exports.createBatch = async (req, res) => {
  try {
    const { name, teacherId, studentIds } = req.body;
    if (!name || !teacherId || !studentIds || studentIds.length === 0) {
      return res.status(400).json({ message: 'Batch name, teacherId and at least one student are required.' });
    }
    const batch = new Batch({ name, teacherId, students: studentIds });
    await batch.save();
    res.status(201).json({ message: `Batch '${name}' created successfully!`, batch });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. GET ALL BATCHES FOR A TEACHER
exports.getTeacherBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ teacherId: req.params.teacherId })
      .populate('students', 'name mobile branch year');
    res.status(200).json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 3. GET ALL BATCHES A STUDENT IS IN
exports.getStudentBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ students: req.params.studentId })
      .populate('teacherId', 'name branch');
    res.status(200).json(batches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 4. GET STUDENTS FILTERED BY BRANCH / YEAR / SESSION
exports.getStudentsByFilter = async (req, res) => {
  try {
    const { branch, year, session } = req.query;
    const filter = { role: 'student' };
    if (branch) filter.branch = branch;
    if (year) filter.year = year;
    if (session) filter.session = session;
    const students = await User.find(filter).select('_id name mobile branch year session');
    res.status(200).json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
