const mongoose = require('mongoose');

const urlSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  url:       { type: String, required: true, trim: true },
  addedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo:[{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // Favicon
  favicon:          { type: String, default: null },
  faviconFetchedAt: { type: Date,   default: null },

  // Health
  healthStatus:  { type: String, enum: ['online','offline','unknown'], default: 'unknown' },
  lastCheckedAt: { type: Date, default: null },
  lastOnlineAt:  { type: Date, default: null },

  // ✅ NEW: Organization
  tags:        { type: [String], default: [] },   // ['internal','crm','hr']
  category:    { type: String, default: '' },      // 'Operations' / 'Finance' etc.
  folder:      { type: String, default: '' },      // 'Team A' / 'Shared' etc.
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Url', urlSchema);