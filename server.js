const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');

// Load environment configuration keys
dotenv.config();

// Connect to MongoDB
connectDB();

const Setting = require('./models/Setting');
const seedSettings = async () => {
  try {
    const branches = await Setting.findOne({ key: 'branches' });
    if (!branches) {
      await Setting.create({ key: 'branches', values: ['CSE', 'IT', 'ECE', 'ME', 'CE'] });
    }
    const sessions = await Setting.findOne({ key: 'sessions' });
    if (!sessions) {
      await Setting.create({ key: 'sessions', values: ['2024-2025', '2025-2026'] });
    }
  } catch (err) {
    console.error('Error seeding settings:', err);
  }
};
seedSettings();

const app = express();

// Middleware Frameworks
app.use(cors()); // Permits your Flutter app to send requests over the network
app.use(express.json({ limit: '10mb' })); // Parses incoming request body payloads as JSON format
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Default Base Route for connection testing
app.get('/', (req, res) => {
  res.status(200).json({ message: "Welcome to the SyncAttend API Node Engine!" });
});

// Inject the custom authentication routes under the /api/auth namespace prefix
app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/attendance', require('./routes/attendanceRoutes')); // Hook up our fresh attendance system routing here
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/settings', require('./routes/settingRoutes'));


// Start listening for app traffic
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server actively listening on port ${PORT}`);
});