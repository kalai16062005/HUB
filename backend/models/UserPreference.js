const mongoose = require('mongoose');

// Per-user preferences — favorites, pin order, custom sort
// Stored separately so URL model stays clean
const userPrefSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true        // one doc per user
  },
  favorites: [{         // array of url _id strings user has starred
    type: String
  }],
  pinned: [{            // pinned urls — shown at top always
    type: String
  }],
  urlOrder: [{          // drag-drop order — array of url _id strings
    type: String
  }],
}, { timestamps: true });

module.exports = mongoose.model('UserPreference', userPrefSchema);