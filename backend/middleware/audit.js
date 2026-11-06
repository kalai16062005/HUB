const AuditLog = require('../models/AuditLog');

const createLog = async ({ performedBy, action, target, details, ipAddress }) => {
  try {
    await AuditLog.create({
      performedBy,
      action,
      target,
      details,
      ipAddress
    });
  } catch (err) {
    
    console.error('Audit log error:', err.message);
  }
};

module.exports = { createLog };


