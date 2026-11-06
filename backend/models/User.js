const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },

  // 2FA
  twoFactorSecret:  { type: String,  default: null },
  twoFactorEnabled: { type: Boolean, default: false },

  // Password
  mustChangePassword: { type: Boolean, default: true },

  // Activity
  lastSeen:     { type: Date,   default: null },
  sessionToken: { type: String, default: null },

  // ── Team — for per-team analytics ────────────────────────────────────────
  team: { type: String, default: 'General', trim: true },

  // ── Opt-in tracking consent ───────────────────────────────────────────────
  // null  = not yet asked → show consent banner
  // true  = accepted      → log activity
  // false = declined      → do NOT log activity
  trackingConsent: { type: Boolean, default: null },

}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);