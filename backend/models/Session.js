const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true                          
  },

 
  sessionId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
    index: true
  },

  ipAddress: { type: String },           

  
  deviceInfo: {
    browser:   { type: String, default: 'Unknown' },
    os:        { type: String, default: 'Unknown' },
    userAgent: { type: String }         
  },

  loginTime:  { type: Date, default: Date.now },   
  lastActive: { type: Date, default: Date.now },   

  status: {
    type: String,
    enum: ['Active', 'Inactive'],        
    default: 'Active'
  }

}, { timestamps: true });


sessionSchema.methods.revoke = function () {
  this.status = 'Inactive';
  this.lastActive = new Date();
  return this.save();
};


sessionSchema.statics.getActiveSessions = function (userId) {
  return this.find({ userId, status: 'Active' }).sort({ lastActive: -1 });
};

module.exports = mongoose.model('Session', sessionSchema);