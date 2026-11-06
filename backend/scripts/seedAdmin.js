/**
 * Admin Seeder Script
 * Usage: node scripts/seedAdmin.js
 *
 * Seeds an initial admin user into MongoDB.
 * If an admin with the same username already exists, it skips creation.
 * Reads connection settings from the .env file in the project root.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../models/User');

// ─── Configure your admin credentials here ──────────────────────────────────
const ADMIN_USERNAME = process.env.SEED_ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin@1234';
// ─────────────────────────────────────────────────────────────────────────────

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' Connected to MongoDB:', process.env.MONGODB_URI);

    const existing = await User.findOne({ username: ADMIN_USERNAME });

    if (existing) {
      console.log(`  Admin user "${ADMIN_USERNAME}" already exists. Skipping seed.`);
      return;
    }

    const admin = new User({
      username: ADMIN_USERNAME,
      password: ADMIN_PASSWORD, // hashed automatically via the pre-save hook
      role: 'admin',
    });

    await admin.save();

    console.log(' Admin user seeded successfully!');
    console.log(`   Username : ${ADMIN_USERNAME}`);
    console.log(`   Password : ${ADMIN_PASSWORD}  ← change this after first login!`);
    console.log(`   Role     : admin`);
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedAdmin();
