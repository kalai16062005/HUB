const express = require('express');
const UserPreference = require('../models/UserPreference');
const checkSession   = require('../middleware/checkSession');
const router = express.Router();

// Helper: get or create pref doc for current user
const getOrCreate = async (userId) => {
  let pref = await UserPreference.findOne({ userId });
  if (!pref) pref = await UserPreference.create({ userId, favorites:[], pinned:[], urlOrder:[] });
  return pref;
};

// GET /api/preferences — load current user's prefs
router.get('/', checkSession, async (req, res) => {
  try {
    const pref = await getOrCreate(req.user.userId);
    res.json(pref);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load preferences' });
  }
});

// PATCH /api/preferences/favorite/:urlId — toggle favorite
router.patch('/favorite/:urlId', checkSession, async (req, res) => {
  try {
    const pref   = await getOrCreate(req.user.userId);
    const urlId  = req.params.urlId;
    const isFav  = pref.favorites.includes(urlId);
    pref.favorites = isFav
      ? pref.favorites.filter(id => id !== urlId)
      : [...pref.favorites, urlId];
    await pref.save();
    res.json({ favorites: pref.favorites });
  } catch {
    res.status(500).json({ message: 'Failed to update favorite' });
  }
});

// PATCH /api/preferences/pin/:urlId — toggle pin
router.patch('/pin/:urlId', checkSession, async (req, res) => {
  try {
    const pref  = await getOrCreate(req.user.userId);
    const urlId = req.params.urlId;
    const isPinned = pref.pinned.includes(urlId);
    pref.pinned = isPinned
      ? pref.pinned.filter(id => id !== urlId)
      : [...pref.pinned, urlId];
    await pref.save();
    res.json({ pinned: pref.pinned });
  } catch {
    res.status(500).json({ message: 'Failed to update pin' });
  }
});

// PATCH /api/preferences/order — save drag-drop order
router.patch('/order', checkSession, async (req, res) => {
  try {
    const { urlOrder } = req.body; // array of url _id strings
    if (!Array.isArray(urlOrder)) return res.status(400).json({ message: 'urlOrder must be array' });
    const pref = await getOrCreate(req.user.userId);
    pref.urlOrder = urlOrder;
    await pref.save();
    res.json({ success: true });
  } catch {
    res.status(500).json({ message: 'Failed to save order' });
  }
});

module.exports = router;