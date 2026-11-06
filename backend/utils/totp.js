const speakeasy = require("speakeasy");
const QRCode = require("qrcode");

// 1. Generate Secret
function generateSecret(username) {
  return speakeasy.generateSecret({
    name: `Hub (${username})`,
    issuer: "Hub Robotic LLP" 
  });
}

// 2. Generate QR Code
async function generateQRCode(otpauth_url) {
  try {
    return await QRCode.toDataURL(otpauth_url);
  } catch (err) {
    console.error("QR Generation Error:", err);
    throw err;
  }
}

// 3. Verify Token Logic 
function verifyToken(secret, token) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: token,
    window: 2 
  });
}

module.exports = { generateSecret, generateQRCode, verifyToken };