const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db.js');

// Load environment configuration keys
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware Frameworks
app.use(cors()); // Permits your Flutter app to send requests over the network
app.use(express.json()); // Parses incoming request body payloads as JSON format

// Default Base Route for connection testing
app.get('/', (req, res) => {
  res.status(200).json({ message: "Welcome to the SyncAttend API Node Engine!" });
});

// Inject the custom authentication routes under the /api/auth namespace prefix
app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/attendance', require('./routes/attendanceRoutes')); // Hook up our fresh attendance system routing here


// Start listening for app traffic
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server actively listening on port ${PORT}`);
});