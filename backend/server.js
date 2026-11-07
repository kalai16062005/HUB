const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const { router: healthRoutes, startHealthWorker } = require('./routes/health');
const prefRoutes = require('./routes/preferences');
const analyticsRoutes = require('./routes/analytics');
// const twofaRoutes = require('./routes/twofa');

app.set('trust proxy', 1);
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// ─── CORS ────────────────────────────────────────────────────────────────────
// const ALLOWED_ORIGIN = ['https://hub.tarcin.in', 'http://localhost:5173', 'http://127.0.0.1:5173'];
const ALLOWED_ORIGIN = ['http://localhost:5000', 'http://127.0.0.1:5000', 'http://localhost:5173', 'http://192.168.29.159:5173', 'http://192.168.29.84:5173', 'https://hub-app-j09g.onrender.com'];
app.use(cors({
  origin: (origin, callback) => {
    // No Origin header = same-origin request through Nginx proxy (always safe to allow).
    // A cross-origin attacker cannot omit the Origin header.
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGIN.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
// ─────────────────────────────────────────────────────────────────────────────


app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', adminRoutes); // GET /api/urls, etc.
app.use('/api/health', healthRoutes);
app.use('/api/preferences', prefRoutes);

app.use('/api/analytics', analyticsRoutes);
// app.use('/api/2fa', twofaRoutes);

// Serve the frontend after API routes so the root and client routes load the app.
app.use(express.static(frontendDist));
app.get('/{*path}', (req, res, next) => {
  if (req.path === '/api' || req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// Database Connection
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    startHealthWorker();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
