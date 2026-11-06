const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String }
  },
  url: {
    urlId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Url' },
    urlName: { type: String },
    urlPath: { type: String }
  },
  duration: {
    type: Number,  // seconds
    default: 0
  },
  openedAt:  { type: Date, default: Date.now },
  closedAt:  { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
