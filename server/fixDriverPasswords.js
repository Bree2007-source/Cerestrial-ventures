// fixDriverPasswords.js
//
// One-time repair script. Run this ONCE from your server folder.
//
// What it does:
//   - Connects to your MongoDB using the same MONGO_URI your server already uses
//   - Looks at every driver in the Driver collection
//   - bcrypt hashes are always 60 characters and start with $2a$ / $2b$ / $2y$
//     — if a driver's password does NOT look like that, it was saved as plain
//     text (likely inserted directly into MongoDB rather than through your
//     app's signup/create-driver flow, which is the only place the
//     pre('save') hashing hook actually runs).
//   - For any plain-text password found, it re-saves that driver through
//     Driver.save() (not a raw update), which triggers the existing
//     pre('save') hook in Driver.js and hashes it properly.
//   - The ORIGINAL password value is preserved — whatever the driver was
//     already typing to log in will keep working after this runs. Nothing
//     needs to be reset or communicated to them.
//
// How to run:
//   1. Place this file in your server/ folder (same level as server.js)
//   2. From that folder, run:  node fixDriverPasswords.js
//   3. Read the console output — it will list exactly which drivers were
//      fixed (by email) and how many were already fine.
//   4. Delete this file afterwards — it's a one-time repair, not something
//      that should run on every deploy.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Driver from './models/Driver.js';

dotenv.config();

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$\d{2}\$.{53}$/;

async function run() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ No MONGO_URI / MONGODB_URI found in your .env file. Aborting.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB.\n');

  // Need the raw password field, so no .select('-password') here.
  const drivers = await Driver.find({});
  console.log(`Found ${drivers.length} driver account(s). Checking passwords...\n`);

  let fixedCount = 0;
  let alreadyOkCount = 0;

  for (const driver of drivers) {
    const looksHashed = typeof driver.password === 'string' && BCRYPT_HASH_PATTERN.test(driver.password);

    if (looksHashed) {
      alreadyOkCount += 1;
      continue;
    }

    console.log(`⚠️  Plain-text password found for: ${driver.email} — fixing now...`);

    // Re-assigning triggers isModified('password') === true, so the
    // pre('save') hook in Driver.js will hash it exactly as it would on
    // normal signup.
    driver.password = driver.password;
    await driver.save();

    fixedCount += 1;
    console.log(`   ✅ Fixed: ${driver.email}`);
  }

  console.log('\n──────────────────────────────');
  console.log(`Done. ${fixedCount} account(s) fixed, ${alreadyOkCount} already OK.`);
  console.log('──────────────────────────────\n');

  if (fixedCount > 0) {
    console.log('Drivers can now log in with the SAME password they were already using.');
  } else {
    console.log('No plain-text passwords were found — the login issue has a different cause.');
    console.log('Next step: double check the exact email/password being typed matches what\'s in the DB.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});