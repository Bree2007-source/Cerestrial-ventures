import mongoose from 'mongoose';
// Adjust the path to your User model if necessary
import User from './models/User.js'; 

// Replace this with your actual MongoDB connection string
const MONGO_URI = 'mongodb+srv://brendah_user:Test1234!@cerestrial-db.qelag1p.mongodb.net/celestrial?retryWrites=true&w=majority&appName=cerestrial-db';

async function updateRole() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to Database');

    const updated = await User.findOneAndUpdate(
      { email: 'driver@cerestrial.com' },
      { $set: { role: 'driver' } },
      { new: true }
    );

    if (updated) {
      console.log('Successfully updated user:', updated.email, 'with role:', updated.role);
    } else {
      console.log('User not found.');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

updateRole();