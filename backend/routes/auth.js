const express    = require('express');
const jwt        = require('jsonwebtoken');
const speakeasy  = require('speakeasy');
const QRCode     = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const UAParser   = require('ua-parser-js');
const User       = require('../models/User');
const Session    = require('../models/Session');
const { protect }      = require('../middleware/auth');
const checkSession     = require('../middleware/checkSession');
const { createLog }    = require('../middleware/audit');
const router = express.Router();

// ── FIX: include username in token so it's always available ──────────────────
// (checkSession also fetches it from DB as a fallback — belt-and-suspenders)
const generateToken = (id, sessionId, role, username) =>
  jwt.sign(
    { userId: id, sessionId, role, username },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

const getIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0].trim() ||
  req.socket.remoteAddress || req.ip;

const createSession = async (userId, req) => {
  const ua = new UAParser(req.headers['user-agent']).getResult();
  return Session.create({
    userId,
    sessionId: uuidv4(),
    ipAddress: getIp(req),
    deviceInfo: {
      userAgent: req.headers['user-agent'],
      browser:   ua.browser.name || 'Unknown',
      os:        ua.os.name      || 'Unknown',
    },
    status: 'Active',
  });
};

// ─── 1. Login ────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = getIp(req);

  try {
    const user = await User.findOne({ username });

    if (!user || !(await user.comparePassword(password))) {
      await createLog({
        performedBy: { username: username || 'unknown' },
        action:  'LOGIN_FAILED',
        target:  { type: 'user', name: username },
        details: `Failed login attempt for username: ${username}`,
        ipAddress: ip,
      });
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // ── 2FA enabled — require OTP, no session yet ───────────────────
    if (user.twoFactorEnabled) {
      const existingActive = await Session.findOne({
        userId: user._id,
        status: 'Active',
      });

      if (existingActive) {
        return res.status(403).json({
          success: false,
          username: user.username,
          twoFactorEnabled: true,
          mustChangePassword: user.mustChangePassword,
          message: 'Already logged in on another device. Please logout from that device first.',
        });
      }

      return res.status(200).json({
        requires2FA: true,
        username:    user.username,
        twoFactorEnabled: true,
        mustChangePassword: user.mustChangePassword,
        message:     '2FA Required',
      });
    }

    // ── First login — must change password ──────────────────────
    if (user.mustChangePassword) {
      const session = await createSession(user._id, req);
      return res.json({
        _id:                user._id,
        username:           user.username,
        role:               user.role,
        mustChangePassword: true,
        twoFactorEnabled:   user.twoFactorEnabled,
        token: generateToken(user._id, session.sessionId, user.role, user.username),
      });
    }

    // ── Normal login ────────────────────────
    const session = await createSession(user._id, req);

    await createLog({
      performedBy: { userId: user._id, username: user.username },
      action:  'LOGIN_SUCCESS',
      target:  { type: 'user', name: user.username },
      details: `${user.username} logged in`,
      ipAddress: ip,
    });

    res.json({
      _id:                user._id,
      username:           user.username,
      role:               user.role,
      mustChangePassword: false,
      twoFactorEnabled:   user.twoFactorEnabled,
      token: generateToken(user._id, session.sessionId, user.role, user.username),
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── 2. OTP Login — verify OTP then create real session ─────────────────────
router.post('/login-otp', async (req, res) => {
  const { username, token } = req.body;
  const ip = getIp(req);

  try {
    const user = await User.findOne({ username });
    if (!user)               return res.status(404).json({ message: 'User not found' });
    if (!user.twoFactorEnabled) return res.status(400).json({ message: '2FA not set up' });

    const verified = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token,
      window:   6,
    });

    if (!verified) {
      return res.status(401).json({ success: false, message: 'Invalid OTP. Try again.' });
    }

    // ── DEVICE LOCK: block if already active on another device ───────────────
    // One active session per user — prevents sharing credentials
    const existingActive = await Session.findOne({
      userId: user._id,
      status: 'Active',
    });

    if (existingActive) {
      return res.status(403).json({
        success: false,
        message: 'Already logged in on another device. Please logout from that device first.',
      });
    }

    // ── OTP correct + no active session → create new session ────────────────
    const session = await createSession(user._id, req);

    await createLog({
      performedBy: { userId: user._id, username: user.username },
      action:  'LOGIN_SUCCESS',
      target:  { type: 'user', name: user.username },
      details: `${user.username} logged in via 2FA`,
      ipAddress: ip,
    });

    res.json({
      success:            true,
      token:              generateToken(user._id, session.sessionId, user.role, user.username),
      _id:                user._id,
      username:           user.username,
      role:               user.role,
      twoFactorEnabled:   true,
      mustChangePassword: false,
    });
  } catch (err) {
    console.error('OTP Login Error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── 3. Setup 2FA QR (protected — logged-in user only) ───────────────────────
// Called from TwoFASetupBanner inside dashboard — token always present
router.post('/setup', checkSession, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name:   `Hub (${user.username})`,
      issuer: 'Hub Robotic',
    });

    user.twoFactorSecret = secret.base32;
    await user.save();

    if (!secret.otpauth_url)
      return res.status(500).json({ message: 'OTP URL generation failed' });

    const qrCodeImage = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ success: true, qrCode: qrCodeImage });
  } catch (err) {
    console.error('2FA Setup Error:', err);
    res.status(500).json({ message: 'QR Setup failed' });
  }
});

// ─── 4. Verify & Enable 2FA (protected — logged-in user only) ────────────────
router.post('/verify', checkSession, async (req, res) => {
  const { token } = req.body;
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isVerified = speakeasy.totp.verify({
      secret:   user.twoFactorSecret,
      encoding: 'base32',
      token,
      window:   6,
    });

    if (!isVerified)
      return res.status(400).json({ success: false, message: 'Invalid OTP' });

    user.twoFactorEnabled = true;
    await user.save();

    res.json({
      success:          true,
      message:          '2FA enabled successfully',
      twoFactorEnabled: true,
    });
  } catch (err) {
    console.error('2FA Verify Error:', err);
    res.status(500).json({ message: 'Verification error' });
  }
});

// ─── 5. Change Password (protected) ─────────────────────────────────────────
router.post('/change-password', protect, async (req, res) => {
  const { newPassword } = req.body;
  try {
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const user = await User.findById(req.user._id);
    user.password          = newPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── 6. Setup Admin ──────────────────────────────────────────────────────────
router.post('/setup-admin', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0)
      return res.status(400).json({ message: 'Admin already exists' });

    const user = await User.create({
      username, password,
      role:               'admin',
      twoFactorEnabled:   false,
      mustChangePassword: false,
    });
    const session = await createSession(user._id, req);
    res.status(201).json({
      _id:      user._id,
      username: user.username,
      role:     user.role,
      token:    generateToken(user._id, session.sessionId, user.role, user.username),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─── 7. Logout ───────────────────────────────────────────────────────────────
router.post('/logout', checkSession, async (req, res) => {
  try {
    if (req.session) {
      req.session.status     = 'Inactive';
      req.session.lastActive = new Date();
      await req.session.save();
    }
    await createLog({
      performedBy: { userId: req.user.userId, username: req.user.username },
      action:  'LOGOUT',
      target:  { type: 'user', name: req.user.username },
      details: `${req.user.username} logged out`,
      ipAddress: req.ip,
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── 8. Get Sessions ─────────────────────────────────────────────────────────
router.get('/sessions', checkSession, async (req, res) => {
  try {
    const query = req.user.role !== 'admin' ? { userId: req.user.userId } : {};
    const sessions = await Session.find(query)
      .populate('userId', 'username role')
      .sort({ lastActive: -1 });
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching sessions' });
  }
});

// ─── 9. Delete User Sessions ───────────────────────────────────────────────────────
router.delete('/sessions/user/:id', checkSession, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.userId !== req.params.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    const result = await Session.deleteMany({ userId: req.params.id });
    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting user sessions' });
  }
});

// ─── 10. Delete Session ───────────────────────────────────────────────────────
router.delete('/sessions/:id', checkSession, async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ message: 'Session not found' });
    if (req.user.role !== 'admin' && session.userId.toString() !== req.user.userId)
      return res.status(403).json({ message: 'Not authorized' });
    await Session.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting session' });
  }
});

// ─── 11. Logout Other Sessions ───────────────────────────────────────────────
router.delete('/sessions/logout-others', checkSession, async (req, res) => {
  try {
    const result = await Session.updateMany(
      {
        userId:    req.user.userId,
        sessionId: { $ne: req.session.sessionId },
        status:    'Active',
      },
      { status: 'Inactive', lastActive: new Date() }
    );
    res.json({
      success: true,
      message: `${result.modifiedCount} sessions marked inactive`,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error logging out other sessions' });
  }
});

module.exports = router;