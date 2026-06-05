import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';

dotenv.config();

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected...');

        const existing = await User.findOne({ email: 'admin@cerestrial.com' });
        if (existing) {
            console.log('Admin already exists!');
            process.exit(0);
        }

        const hash = await bcrypt.hash('admin123', 10);
        await User.create({
            name: 'Admin',
            email: 'admin@cerestrial.com',
            password: hash,
            isAdmin: true
        });

        console.log('✅ Admin created!');
        console.log('Email: admin@cerestrial.com');
        console.log('Password: admin123');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createAdmin();