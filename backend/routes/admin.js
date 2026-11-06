const express = require('express');
const User    = require('../models/User');
const Url     = require('../models/Url');
const https   = require('https');
const http    = require('http');
const { protect, adminOnly } = require('../middleware/auth');
const { createLog }          = require('../middleware/audit');
const router = express.Router();

// ─── helpers ────────────────────────────────────────────────────────────────

// Escape CSV cell (handles commas, quotes, newlines)
const csvCell = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Fetch favicon for a URL and return base64 data URI (or null on failure)
const fetchFavicon = (targetUrl) => new Promise((resolve) => {
  try {
    const origin = new URL(targetUrl).origin;
    const faviconUrl = `${origin}/favicon.ico`;
    const lib = faviconUrl.startsWith('https') ? https : http;

    const req = lib.get(faviconUrl, { timeout: 5000 }, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        if (buf.length < 10) return resolve(null);
        const mime = res.headers['content-type'] || 'image/x-icon';
        resolve(`data:${mime};base64,${buf.toString('base64')}`);
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  } catch {
    resolve(null);
  }
});

// ─── User Management ────────────────────────────────────────────────────────

router.get('/users', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

router.post('/users', protect, adminOnly, async (req, res) => {
  const { username, role } = req.body;
  try {
    const userExists = await User.findOne({ username });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const tempPassword = Math.random().toString(36).slice(-6).toUpperCase() +
                         Math.random().toString(36).slice(-4) + 'A1!';
    const user = await User.create({
      username, password: tempPassword,
      role: role || 'user',
      mustChangePassword: role === 'admin' ? false : true
    });
    res.status(201).json({ _id: user._id, username: user.username, role: user.role, tempPassword });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/users/bulk', protect, adminOnly, async (req, res) => {
  const { users } = req.body;
  const results = [];
  for (const u of users) {
    try {
      const exists = await User.findOne({ username: u.username });
      if (exists) { results.push({ username: u.username, status: 'failed', reason: 'Already exists' }); continue; }
      const tempPassword = Math.random().toString(36).slice(-6).toUpperCase() +
                           Math.random().toString(36).slice(-4) + 'A1!';
      const newUser = await User.create({ username: u.username, password: tempPassword, role: u.role || 'user', mustChangePassword: true });
      await createLog({ performedBy: { userId: req.user._id, username: req.user.username }, action: 'USER_CREATED', target: { type: 'user', id: newUser._id.toString(), name: u.username }, details: `Bulk created user: ${u.username}`, ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
      results.push({ username: u.username, tempPassword, status: 'created' });
    } catch {
      results.push({ username: u.username, status: 'failed', reason: 'Error' });
    }
  }
  res.json({ success: true, results });
});

router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const deletedUsername = user?.username || 'unknown';
    await User.findByIdAndDelete(req.params.id);
    await createLog({ performedBy: { userId: req.user._id, username: req.user.username }, action: 'USER_DELETED', target: { type: 'user', id: req.params.id, name: deletedUsername }, details: `Admin deleted user: ${deletedUsername}`, ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    res.json({ message: 'User removed' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// ── Force-logout a user (mark all their active sessions as Inactive) ──────────
router.post('/users/:id/force-logout', protect, adminOnly, async (req, res) => {
  try {
    const Session = require('../models/Session');
    const targetUser = await User.findById(req.params.id).select('username');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const result = await Session.updateMany(
      { userId: req.params.id, status: 'Active' },
      { status: 'Inactive', lastActive: new Date() }
    );

    await createLog({
      performedBy: { userId: req.user._id, username: req.user.username },
      action: 'LOGOUT',
      target: { type: 'user', id: req.params.id, name: targetUser.username },
      details: `Admin force-logged out: ${targetUser.username} (${result.modifiedCount} session${result.modifiedCount !== 1 ? 's' : ''} ended)`,
      ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    });

    res.json({ success: true, sessionsEnded: result.modifiedCount, username: targetUser.username });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// NEW: Export users as CSV
router.get('/users/export-csv', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    const header = 'username,role,twoFactorEnabled,mustChangePassword,createdAt';
    const rows = users.map(u =>
      [csvCell(u.username), csvCell(u.role), csvCell(u.twoFactorEnabled),
       csvCell(u.mustChangePassword), csvCell(new Date(u.createdAt).toISOString())].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    res.send([header, ...rows].join('\n'));
  } catch {
    res.status(500).json({ message: 'Export failed' });
  }
});

// ─── URL Management ──────────────────────────────────────────────────────────

router.get('/urls', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') query = { assignedTo: { $in: [req.user._id] } };
    const urls = await Url.find(query).populate('assignedTo', 'username');
    res.json(urls);
  } catch {
    res.status(500).json({ message: 'Server error fetching URLs' });
  }
});

router.post('/urls', protect, adminOnly, async (req, res) => {
  const { name, url, assignedTo, tags, folder, category, description } = req.body;
  try {
    const favicon = await fetchFavicon(url);
    const newUrl = await Url.create({
      name, url,
      addedBy: req.user._id,
      assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []),
      favicon,
      faviconFetchedAt: favicon ? new Date() : null,
      tags: Array.isArray(tags) ? tags : [],
      folder: folder || '',
      category: category || '',
      description: description || ''
    });
    await createLog({ performedBy: { userId: req.user._id, username: req.user.username }, action: 'URL_ADDED', target: { type: 'url', id: newUrl._id.toString(), name }, details: `Admin added URL: ${name} → ${url}`, ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    res.status(201).json(newUrl);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/urls/:id', protect, adminOnly, async (req, res) => {
  const { name, url, assignedTo, tags, folder, category, description } = req.body;
  try {
    // Re-fetch favicon if URL changed
    const existing = await Url.findById(req.params.id);
    let favicon = existing?.favicon || null;
    let faviconFetchedAt = existing?.faviconFetchedAt || null;
    if (url && url !== existing?.url) {
      favicon = await fetchFavicon(url);
      faviconFetchedAt = favicon ? new Date() : null;
    }

    const updatedUrl = await Url.findByIdAndUpdate(
      req.params.id,
      { name, url, assignedTo: Array.isArray(assignedTo) ? assignedTo : (assignedTo ? [assignedTo] : []),
        favicon, faviconFetchedAt,
        tags: Array.isArray(tags) ? tags : [],
        folder: folder || '',
        category: category || '',
        description: description || ''
      },
      { new: true }
    ).populate('assignedTo', 'username');

    if (!updatedUrl) return res.status(404).json({ message: 'URL not found' });
    await createLog({ performedBy: { userId: req.user._id, username: req.user.username }, action: 'URL_UPDATED', target: { type: 'url', id: req.params.id, name }, details: `Admin updated URL: ${name}`, ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    res.json(updatedUrl);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/urls/:id', protect, adminOnly, async (req, res) => {
  try {
    const urlDoc = await Url.findById(req.params.id);
    await Url.findByIdAndDelete(req.params.id);
    await createLog({ performedBy: { userId: req.user._id, username: req.user.username }, action: 'URL_DELETED', target: { type: 'url', id: req.params.id, name: urlDoc?.name || 'unknown' }, details: `Admin deleted URL: ${urlDoc?.name}`, ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress });
    res.json({ message: 'URL removed' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// NEW: Export URLs as CSV (with user assignments)
router.get('/urls/export-csv', protect, adminOnly, async (req, res) => {
  try {
    const urls = await Url.find({}).populate('assignedTo', 'username').populate('addedBy', 'username');
    const header = 'name,url,folder,category,tags,assignedTo,addedBy,healthStatus,createdAt';
    const rows = urls.map(u =>
      [
        csvCell(u.name),
        csvCell(u.url),
        csvCell(u.folder || ''),
        csvCell(u.category || ''),
        csvCell((u.tags || []).join(';')),
        csvCell((u.assignedTo || []).map(x => x.username).join(';')),
        csvCell(u.addedBy?.username || ''),
        csvCell(u.healthStatus || 'unknown'),
        csvCell(new Date(u.createdAt).toISOString()),
      ].join(',')
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="urls.csv"');
    res.send([header, ...rows].join('\n'));
  } catch {
    res.status(500).json({ message: 'Export failed' });
  }
});

// NEW: Bulk import URLs from CSV body
router.post('/urls/bulk', protect, adminOnly, async (req, res) => {
  const { urls } = req.body; // [{name, url, assignedTo:[usernames]}]
  const results = [];
  const allUsers = await User.find({}).select('_id username');
  const userMap = Object.fromEntries(allUsers.map(u => [u.username.toLowerCase(), u._id]));

  for (const item of urls) {
    try {
      if (!item.name || !item.url) { results.push({ name: item.name, status: 'failed', reason: 'Missing name or url' }); continue; }
      const assignedIds = (item.assignedTo || [])
        .map(uname => userMap[uname.toLowerCase()])
        .filter(Boolean);
      const favicon = await fetchFavicon(item.url);
      const newUrl = await Url.create({
        name: item.name, url: item.url,
        addedBy: req.user._id,
        assignedTo: assignedIds,
        favicon,
        faviconFetchedAt: favicon ? new Date() : null
      });
      results.push({ name: item.name, status: 'created', id: newUrl._id });
    } catch {
      results.push({ name: item.name, status: 'failed', reason: 'Error' });
    }
  }
  res.json({ success: true, results });
});

//  NEW: Refresh favicon for a single URL
router.post('/urls/:id/refresh-favicon', protect, adminOnly, async (req, res) => {
  try {
    const urlDoc = await Url.findById(req.params.id);
    if (!urlDoc) return res.status(404).json({ message: 'URL not found' });
    const favicon = await fetchFavicon(urlDoc.url);
    urlDoc.favicon = favicon;
    urlDoc.faviconFetchedAt = favicon ? new Date() : null;
    await urlDoc.save();
    res.json({ success: true, favicon });
  } catch {
    res.status(500).json({ message: 'Favicon refresh failed' });
  }
});

// ─── Audit Logs ──────────────────────────────────────────────────────────────

router.get('/audit-logs', protect, adminOnly, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    const logs = await AuditLog.find({}).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch {
    res.status(500).json({ message: 'Server error fetching logs' });
  }
});

// Delete ALL audit logs
router.delete('/audit-logs', protect, adminOnly, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    await AuditLog.deleteMany({});
    res.json({ success: true, message: 'All audit logs cleared' });
  } catch {
    res.status(500).json({ message: 'Server error clearing logs' });
  }
});

// Delete single audit log
router.delete('/audit-logs/:id', protect, adminOnly, async (req, res) => {
  try {
    const AuditLog = require('../models/AuditLog');
    await AuditLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Log deleted successfully' });
  } catch {
    res.status(500).json({ message: 'Error deleting log' });
  }
});

// ─── Activity ────────────────────────────────────────────────────────────────

const ActivityLog = require('../models/ActivityLog');

router.post('/activity/start', protect, async (req, res) => {
  try {
    if (req.user.trackingConsent !== true) {
      return res.json({ success: true, activityId: null });
    }

    const { urlId, urlName, urlPath } = req.body;
    const log = await ActivityLog.create({ user: { userId: req.user._id, username: req.user.username }, url: { urlId, urlName, urlPath }, openedAt: new Date() });
    res.json({ success: true, activityId: log._id });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/activity/end/:id', protect, async (req, res) => {
  try {
    const { duration } = req.body;
    await ActivityLog.findByIdAndUpdate(req.params.id, { closedAt: new Date(), duration: Math.round(duration) });
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/activity', protect, adminOnly, async (req, res) => {
  try {
    const logs = await ActivityLog.find({}).sort({ openedAt: -1 }).limit(200);
    res.json(logs);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;