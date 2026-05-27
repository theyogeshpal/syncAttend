const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const user = await User.findOne({ mobile: '7668301822' });
    if (!user) {
        console.log("User not found!");
    } else {
        console.log("User found:", user.name, user.mobile, user.role);
        const isMatch = await bcrypt.compare('Kmc@2004', user.password);
        console.log("Password match for Kmc@2004:", isMatch);
    }
    mongoose.connection.close();
  })
  .catch(err => {
    console.error(err);
    mongoose.connection.close();
  });
