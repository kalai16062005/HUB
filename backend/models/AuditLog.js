const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
 
  performedBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: { type: String }
  },
 
  action: {
    type: String,
    enum: [
      'USER_CREATED',
      'USER_DELETED',
      'URL_ADDED',
      'URL_DELETED',
      'URL_UPDATED',
      'LOGIN_SUCCESS',
      'LOGIN_FAILED'
    ],
    required: true
  },

  action: {
  type: String,
  enum: [
    'USER_CREATED',
    'USER_DELETED',
    'URL_ADDED',
    'URL_DELETED',
    'URL_UPDATED',
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'LOGOUT'        
  ],
  required: true
},
 
  target: {
    type: { type: String },  // 'user' / 'url'
    id: { type: String },
    name: { type: String }
  },
 
  details: {
    type: String
  },
  // IP address
  ipAddress: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);