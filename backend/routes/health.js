const express  = require('express');
const https    = require('https');
const http     = require('http');
const Url      = require('../models/Url');
const { protect, adminOnly } = require('../middleware/auth');
const router   = express.Router();

// ─── Ping helper ─────────────────────────────────────────────────────────────
// Returns 'online' or 'offline' for a given URL string
const pingUrl = (targetUrl) => new Promise((resolve) => {
  try {
    const parsed = new URL(targetUrl);
    const lib    = parsed.protocol === 'https:' ? https : http;
    const req    = lib.get(
      { hostname: parsed.hostname, port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80), path: '/', timeout: 6000 },
      (res) => {
        res.resume(); // drain so socket closes
        resolve(res.statusCode < 600 ? 'online' : 'offline');
      }
    );
    req.on('error',   () => resolve('offline'));
    req.on('timeout', () => { req.destroy(); resolve('offline'); });
  } catch {
    resolve('offline');
  }
});

// ─── Background worker ───────────────────────────────────────────────────────
// Pings all URLs every 2 minutes and updates healthStatus in DB.
// Called once from server.js on startup.
const PING_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes

const runHealthChecks = async () => {
  try {
    const urls = await Url.find({});
    await Promise.all(
      urls.map(async (urlDoc) => {
        const status = await pingUrl(urlDoc.url);
        urlDoc.healthStatus  = status;
        urlDoc.lastCheckedAt = new Date();
        if (status === 'online') urlDoc.lastOnlineAt = new Date();
        await urlDoc.save();
      })
    );
    console.log(`[health] checked ${urls.length} URLs`);
  } catch (err) {
    console.error('[health] check error:', err.message);
  }
};

const startHealthWorker = () => {
  // Run once immediately on startup, then repeat
  runHealthChecks();
  setInterval(runHealthChecks, PING_INTERVAL_MS);
};

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/health/status — returns health snapshot for all URLs
router.get('/status', protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') query = { assignedTo: { $in: [req.user._id] } };
    const urls = await Url.find(query).select('_id name healthStatus lastCheckedAt lastOnlineAt');
    res.json(urls);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/health/ping/:id — manual one-off ping (admin only)
router.post('/ping/:id', protect, adminOnly, async (req, res) => {
  try {
    const urlDoc = await Url.findById(req.params.id);
    if (!urlDoc) return res.status(404).json({ message: 'URL not found' });
    const status = await pingUrl(urlDoc.url);
    urlDoc.healthStatus  = status;
    urlDoc.lastCheckedAt = new Date();
    if (status === 'online') urlDoc.lastOnlineAt = new Date();
    await urlDoc.save();
    res.json({ success: true, status, lastCheckedAt: urlDoc.lastCheckedAt });
  } catch {
    res.status(500).json({ message: 'Ping failed' });
  }
});

module.exports = { router, startHealthWorker };