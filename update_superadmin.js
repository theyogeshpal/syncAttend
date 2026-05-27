const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log("Connected to MongoDB.");
    const mobile = '7668301822';
    const password = 'Kmc@2004';
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let superadmin = await User.findOne({ role: 'superadmin' });
    if (superadmin) {
        superadmin.mobile = mobile;
        superadmin.password = hashedPassword;
        superadmin.name = 'Super Admin';
        await superadmin.save();
        console.log("Superadmin updated.");
    } else {
        superadmin = new User({
            name: 'Super Admin',
            mobile: mobile,
            password: hashedPassword,
            role: 'superadmin'
        });
        await superadmin.save();
        console.log("Superadmin created.");
    }
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error(err);
    mongoose.connection.close();
  });
