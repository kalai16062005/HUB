const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session'); 

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      
      const session = await Session.findOne({ 
        sessionId: decoded.sessionId 
      });

      if (!session || session.status !== 'Active') {
        return res.status(401).json({
          message: 'Session expired or revoked. Please login again.'
        });
      }

     
      req.user = await User.findById(decoded.userId).select('-password');

     
      req.sessionId = decoded.sessionId;

      return next();
    } catch (error) {
      console.error('Token verification error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

module.exports = { protect, adminOnly };