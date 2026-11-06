const jwt     = require('jsonwebtoken');
const Session = require('../models/Session');
const User    = require('../models/User');

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // ── Find session in DB ────────────────────────────────────────────────────
    const session = await Session.findOne({
      sessionId: decoded.sessionId,
      userId:    decoded.userId,
    });

    if (!session) {
      return res.status(401).json({ message: 'Session not found' });
    }

    if (session.status === 'Inactive') {
      return res.status(401).json({ message: 'Session expired. Please login again.' });
    }

    // ── FIX: fetch username from DB — token does not carry it ─────────────────
    // generateToken only encodes { userId, sessionId, role }, NOT username.
    // All routes that use req.user.username (logout, audit logs) need this.
    const userDoc = await User.findById(decoded.userId).select('username').lean();
    const username = userDoc?.username || 'unknown';

    // ── Update last active timestamp ──────────────────────────────────────────
    session.lastActive = new Date();
    await session.save();

    // ── Attach user + session to request ─────────────────────────────────────
    req.user = {
      userId:   decoded.userId,
      username,                  // ← from DB, never undefined
      role:     decoded.role,
    };

    req.session = session;
    next();

  } catch (err) {
    res.status(500).json({ message: 'Auth check failed', error: err.message });
  }
};