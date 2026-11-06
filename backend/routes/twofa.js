const express = require("express");
const router = express.Router();
const { generateSecret, generateQRCode } = require("../utils/totp");
const User = require("../models/User");
const speakeasy = require("speakeasy");
const jwt = require("jsonwebtoken");


// ---------------- LOGIN ----------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) return res.status(400).json({ message: "Invalid password" });

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled
      }
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// ---------------- SETUP QR ----------------
router.post("/setup", async (req, res) => {
  try {
    const { username } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.twoFactorEnabled) {
      return res.status(400).json({ message: "2FA already enabled" });
    }

    const secret = generateSecret(username);

    // IMPORTANT FIX (SAVE TEMP SECRET)
    user.tempSecret = secret.base32;
    await user.save();

    const qr = await generateQRCode(secret.otpauth_url);

    console.log("QR Generated:", qr);

    res.json({
      qrCode: qr,
      tempSecret: secret.base32
    });

  } catch (err) {
    console.error("SETUP ERROR:", err);
    res.status(500).json({ message: "Error" });
  }
});


// ---------------- VERIFY OTP ----------------
router.post("/verify", async (req, res) => {
  try {
    const { username, token, tempSecret } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    //  USE DB tempSecret fallback
    const secretToUse = tempSecret || user.tempSecret;

    const verified = speakeasy.totp.verify({
      secret: secretToUse,
      encoding: "base32",
      token: token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    //  FIRST TIME ENABLE
    if (!user.twoFactorEnabled) {
      user.twoFactorEnabled = true;
      user.twoFactorSecret = secretToUse;
      user.tempSecret = undefined;
      await user.save();
    }

    res.json({
      message: "2FA Verified",
      token: "dummy-jwt-token",
      user
    });

  } catch (err) {
    console.error("VERIFY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;