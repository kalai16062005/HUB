const express      = require('express');
const ActivityLog  = require('../models/ActivityLog');
const User         = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const router = express.Router();

// ── helpers ───────────────────────────────────────────────────────────────────
const startOf = (unit) => {
  const d = new Date();
  if (unit === 'week')  { d.setDate(d.getDate() - 6);  d.setHours(0,0,0,0); }
  if (unit === 'month') { d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); }
  return d;
};

// ── POST /api/analytics/consent ───────────────────────────────────────────────
// User accepts or declines tracking
router.post('/consent', protect, async (req, res) => {
  try {
    const { consent } = req.body; // true | false
    await User.findByIdAndUpdate(req.user._id || req.user.userId, { trackingConsent: consent });
    res.json({ success: true, trackingConsent: consent });
  } catch (err) {
    res.status(500).json({ message: 'Consent update failed', error: err.message });
  }
});

// ── GET /api/analytics/my-consent ────────────────────────────────────────────
// Check current user's consent status
router.get('/my-consent', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.userId).select('trackingConsent');
    res.json({ trackingConsent: user?.trackingConsent ?? null });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching consent' });
  }
});

// ── GET /api/analytics/my-stats ──────────────────────────────────────────────
// Normal user — own stats only (role-based visibility)
router.get('/my-stats', protect, async (req, res) => {
  try {
    const userId   = req.user._id || req.user.userId;
    const username = req.user.username;
    const period   = req.query.period || 'month';
    const match    = {
      'user.username': username,
      ...(period !== 'all' ? { openedAt: { $gte: startOf(period) } } : {}),
    };

    const [views, durationRes, topUrls, trends] = await Promise.all([
      ActivityLog.countDocuments(match),
      ActivityLog.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: '$duration' } } }]),
      ActivityLog.aggregate([
        { $match: match },
        { $group: { _id: '$url.urlName', views: { $sum: 1 }, totalTime: { $sum: '$duration' } } },
        { $sort: { views: -1 } },
        { $limit: 5 },
      ]),
      ActivityLog.aggregate([
        { $match: match },
        { $group: {
            _id: { year: { $year:'$openedAt' }, month: { $month:'$openedAt' }, day: { $dayOfMonth:'$openedAt' } },
            views: { $sum: 1 },
        }},
        { $sort: { '_id.year':1, '_id.month':1, '_id.day':1 } },
      ]),
    ]);

    res.json({
      totalViews:    views,
      totalDuration: durationRes[0]?.total || 0,
      topUrls,
      trends,
    });
  } catch (err) {
    res.status(500).json({ message: 'My stats error', error: err.message });
  }
});

// ── GET /api/analytics/summary ────────────────────────────────────────────────
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const [totalViews, totalDuration, uniqueUsers, uniqueUrls] = await Promise.all([
      ActivityLog.countDocuments(),
      ActivityLog.aggregate([{ $group: { _id: null, total: { $sum: '$duration' } } }]),
      ActivityLog.distinct('user.username'),
      ActivityLog.distinct('url.urlId'),
    ]);

    const today = new Date(); today.setHours(0,0,0,0);
    const todayViews = await ActivityLog.countDocuments({ openedAt: { $gte: today } });

    res.json({
      totalViews,
      totalDuration: totalDuration[0]?.total || 0,
      uniqueUsers:   uniqueUsers.filter(Boolean).length,
      uniqueUrls:    uniqueUrls.filter(Boolean).length,
      todayViews,
    });
  } catch (err) {
    res.status(500).json({ message: 'Analytics summary error', error: err.message });
  }
});

// ── GET /api/analytics/top-urls ───────────────────────────────────────────────
router.get('/top-urls', protect, adminOnly, async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit) || 10;
    const period = req.query.period || 'all';
    const match  = period !== 'all' ? { openedAt: { $gte: startOf(period) } } : {};

    const data = await ActivityLog.aggregate([
      { $match: match },
      { $group: {
          _id:         '$url.urlId',
          urlName:     { $first: '$url.urlName' },
          urlPath:     { $first: '$url.urlPath' },
          views:       { $sum: 1 },
          totalTime:   { $sum: '$duration' },
          avgTime:     { $avg: '$duration' },
          uniqueUsers: { $addToSet: '$user.username' },
      }},
      { $project: {
          urlName: 1, urlPath: 1, views: 1, totalTime: 1,
          avgTime:     { $round: ['$avgTime', 0] },
          uniqueUsers: { $size: '$uniqueUsers' },
      }},
      { $sort: { views: -1 } },
      { $limit: limit },
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ message: 'Top URLs error', error: err.message });
  }
});

// ── GET /api/analytics/user-usage ─────────────────────────────────────────────
router.get('/user-usage', protect, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const match  = period !== 'all' ? { openedAt: { $gte: startOf(period) } } : {};

    const data = await ActivityLog.aggregate([
      { $match: match },
      { $group: {
          _id:       '$user.username',
          views:     { $sum: 1 },
          totalTime: { $sum: '$duration' },
          avgTime:   { $avg: '$duration' },
          urls:      { $addToSet: '$url.urlName' },
          lastSeen:  { $max: '$openedAt' },
      }},
      { $project: {
          username: '$_id', views: 1, totalTime: 1,
          avgTime:  { $round: ['$avgTime', 0] },
          urlCount: { $size: '$urls' },
          lastSeen: 1,
      }},
      { $sort: { views: -1 } },
    ]);

    // Attach team info from User collection
    const users = await User.find({}).select('username team trackingConsent');
    const teamMap = {};
    users.forEach(u => { teamMap[u.username] = { team: u.team || 'General', trackingConsent: u.trackingConsent }; });

    const enriched = data.map(d => ({
      ...d,
      team:            teamMap[d.username]?.team            || 'General',
      trackingConsent: teamMap[d.username]?.trackingConsent ?? null,
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: 'User usage error', error: err.message });
  }
});

// ── GET /api/analytics/team-usage ─────────────────────────────────────────────
// Per-team breakdown — groups users by their team field
router.get('/team-usage', protect, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || 'all';
    const match  = period !== 'all' ? { openedAt: { $gte: startOf(period) } } : {};

    // Get all users with teams
    const users = await User.find({}).select('username team');
    const usernameToTeam = {};
    users.forEach(u => { usernameToTeam[u.username] = u.team || 'General'; });

    // Aggregate activity logs
    const logs = await ActivityLog.aggregate([
      { $match: match },
      { $group: {
          _id:       '$user.username',
          views:     { $sum: 1 },
          totalTime: { $sum: '$duration' },
          urls:      { $addToSet: '$url.urlName' },
          lastSeen:  { $max: '$openedAt' },
      }},
    ]);

    // Group by team
    const teamMap = {};
    logs.forEach(log => {
      const team = usernameToTeam[log._id] || 'General';
      if (!teamMap[team]) {
        teamMap[team] = { team, views: 0, totalTime: 0, members: new Set(), urls: new Set(), lastSeen: null };
      }
      teamMap[team].views     += log.views;
      teamMap[team].totalTime += log.totalTime;
      teamMap[team].members.add(log._id);
      log.urls.forEach(u => teamMap[team].urls.add(u));
      if (!teamMap[team].lastSeen || new Date(log.lastSeen) > new Date(teamMap[team].lastSeen)) {
        teamMap[team].lastSeen = log.lastSeen;
      }
    });

    // Add teams with 0 activity too
    const allTeams = [...new Set(users.map(u => u.team || 'General'))];
    allTeams.forEach(team => {
      if (!teamMap[team]) {
        const memberCount = users.filter(u => (u.team || 'General') === team).length;
        teamMap[team] = { team, views: 0, totalTime: 0, members: new Set(), urls: new Set(), lastSeen: null, memberCount };
      }
    });

    const result = Object.values(teamMap).map(t => ({
      team:        t.team,
      views:       t.views,
      totalTime:   t.totalTime,
      memberCount: t.memberCount || t.members.size,
      urlCount:    t.urls.size,
      lastSeen:    t.lastSeen,
    })).sort((a, b) => b.views - a.views);

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Team usage error', error: err.message });
  }
});

// ── GET /api/analytics/trends ─────────────────────────────────────────────────
router.get('/trends', protect, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || 'week';
    const days   = period === 'month' ? 30 : 7;
    const from   = startOf(period);

    const raw = await ActivityLog.aggregate([
      { $match: { openedAt: { $gte: from } } },
      { $group: {
          _id: { year: { $year:'$openedAt' }, month: { $month:'$openedAt' }, day: { $dayOfMonth:'$openedAt' } },
          views:     { $sum: 1 },
          totalTime: { $sum: '$duration' },
      }},
      { $sort: { '_id.year':1, '_id.month':1, '_id.day':1 } },
    ]);

    const map = {};
    raw.forEach(r => {
      const key = `${r._id.year}-${String(r._id.month).padStart(2,'0')}-${String(r._id.day).padStart(2,'0')}`;
      map[key] = { views: r.views, totalTime: r.totalTime };
    });

    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
      const key   = d.toISOString().slice(0,10);
      const label = d.toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
      result.push({ date: key, label, ...(map[key] || { views: 0, totalTime: 0 }) });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Trends error', error: err.message });
  }
});

// ── GET /api/analytics/hourly ─────────────────────────────────────────────────
router.get('/hourly', protect, adminOnly, async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const match  = period !== 'all' ? { openedAt: { $gte: startOf(period) } } : {};

    const raw = await ActivityLog.aggregate([
      { $match: match },
      { $group: { _id: { $hour: '$openedAt' }, views: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour:  h,
      label: `${String(h).padStart(2,'0')}:00`,
      views: raw.find(r => r._id === h)?.views || 0,
    }));
    res.json(hours);
  } catch (err) {
    res.status(500).json({ message: 'Hourly error', error: err.message });
  }
});

// ── PATCH /api/analytics/user-team ───────────────────────────────────────────
// Admin — update a user's team
router.patch('/user-team', protect, adminOnly, async (req, res) => {
  try {
    const { username, team } = req.body;
    if (!username || !team) return res.status(400).json({ message: 'username and team required' });
    await User.findOneAndUpdate({ username }, { team: team.trim() });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Team update failed', error: err.message });
  }
});

module.exports = router;