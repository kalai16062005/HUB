# HUB

HUB is a role-based internal web application for organizing, assigning, and accessing bookmarked URLs through a dashboard. It is designed for internal teams that need a central place to manage trusted links, folders, sessions, admin controls, and activity reporting.

The project contains a React + Vite frontend and an Express + MongoDB backend. The frontend provides the user dashboard, folder navigation, security screens, and admin tools. The backend exposes authentication, URL management, analytics, and audit APIs.

## Project overview

This application helps users:

- open internal or team-specific web resources from a managed dashboard
- organize links by folder and category
- view personal or team analytics and usage activity
- manage their sessions and security settings
- allow admins to create users, assign URLs, review activity, and monitor session health

The product is built for an internal business workflow rather than a public-facing SaaS app. It expects trusted users, private network access, and a MongoDB-backed backend.

## Features

- Secure login with username/password authentication
- Optional two-factor authentication using TOTP and QR-code setup
- Password change flow for first-time or required password reset
- Admin dashboard for user and URL management
- Bulk user and URL import helpers
- Folder-based URL organization
- Favorites and pinned shortcuts for quick access
- Session tracking and login history
- Audit logs and activity monitoring
- Analytics summaries for user and platform usage
- URL health status viewing and an admin-triggered URL ping
- Role-based permissions for regular users and admins

## Architecture

### Frontend
- React 19
- Vite
- React Router
- Axios
- Lucide icon set
- Browser local storage for auth session persistence; favorites, pins, and URL order are also stored through the backend preferences API

### Backend
- Express 5
- MongoDB via Mongoose
- JWT-based authentication
- bcrypt password hashing
- TOTP generation and verification with `speakeasy`
- QR-code generation using `qrcode`
- CORS

## Folder structure

```text
.
├── backend/
│   ├── middleware/       # authentication, session, and audit middleware
│   ├── models/           # Mongoose models
│   ├── routes/           # authentication, admin, analytics, health, preferences
│   ├── scripts/          # admin seeding script
│   ├── utils/            # TOTP helpers
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── frontend/
│   ├── public/           # public static assets
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── README.md
│   └── vite.config.js
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

Local `.env` and `.env.production` files, `node_modules`, and build output are ignored and are not part of this structure.

## Prerequisites

Before running the project, install:

- Node.js `^20.19.0` or `>=22.12.0` (required by the installed Vite 8 version)
- npm
- MongoDB running locally or at a reachable MongoDB URI

## Environment setup

### Backend
Create or edit `backend/.env` with values like:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/iframehub
JWT_SECRET=replace_with_a_long_random_secret
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=replace_with_a_strong_temporary_password
```

The server reads `PORT` (default `5000`), `MONGODB_URI`, and `JWT_SECRET`. The admin seeding script also reads `SEED_ADMIN_USERNAME` (default `admin`) and `SEED_ADMIN_PASSWORD`; if the password is omitted, the script uses a built-in fallback. Set a strong password in the ignored local `backend/.env` before seeding, and do not commit credentials.

The `start:prod` script loads `backend/.env.production`. Create that local file only if using that script, and keep its values private.

### Frontend
Create or edit `frontend/.env` with:

```env
VITE_API_URL=http://localhost:5000
```

If your backend is served elsewhere, change this URL to match the API host.

## Install dependencies

Start each command block from the project root:

```sh
cd backend
npm install
```

```sh
cd frontend
npm install
```

## Start the application

Open two terminals.

### Terminal 1: backend

```sh
cd backend
npm run dev
```

The backend listens on `PORT` from `backend/.env`, or port `5000` if `PORT` is unset. It connects to MongoDB before it starts listening.

### Terminal 2: frontend

```sh
cd frontend
npm run dev
```

The frontend should run on the Vite default URL, usually:

- http://localhost:5173

## Available scripts

### Backend

```sh
cd backend
npm run dev          # start with nodemon
npm start            # start server without nodemon
npm run start:prod   # start using .env.production
npm run seed:admin   # run admin seeding helper
```

The backend also defines `npm test`, but it is currently a placeholder that exits with an error; there is no backend test suite configured.

### Frontend

```sh
cd frontend
npm run dev          # start Vite dev server
npm run build        # create production build
npm run lint         # run ESLint checks
npm run preview      # preview built frontend
```

The root `package.json` has no npm scripts; run frontend and backend scripts from their respective directories.

## API and app URLs

Default local setup:

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Authenticated health status: `GET http://localhost:5000/api/health/status`
- Admin-only manual URL ping: `POST http://localhost:5000/api/health/ping/:id`

Set `VITE_API_URL` to the backend origin without `/api`. Some frontend modules use this variable directly without a fallback.

The frontend also requests `GET /api/auth/me` and `GET /api/auth/sessions/me`, but these paths are not registered by the backend. The backend defines `GET /api/auth/sessions`.

## Authentication and security notes

The backend uses:

- JWT tokens for authenticated requests
- user permissions based on `role`
- session tracking for active device login state
- optional TOTP two-factor authentication
- password hashing using `bcryptjs`

Important notes:

- Some routes are protected with `protect` and `adminOnly` middleware.
- When 2FA is enabled, the login flow blocks another login if the user already has an active session.
- Secret values such as `JWT_SECRET` and MongoDB credentials must never be committed to source control.

## Key backend modules

- `backend/server.js`: Express startup, MongoDB connection, CORS handling, and API route mounting
- `backend/routes/auth.js`: login, logout, password change, and TOTP setup/verification
- `backend/routes/admin.js`: user management, URL management, exports, and admin actions
- `backend/models/User.js`: user schema and password comparison logic
- `backend/middleware/auth.js`: JWT and role-based access checks
- `backend/routes/analytics.js`: tracking consent and analytics endpoints

## Key frontend modules

- `frontend/src/App.jsx`: main routing shell and dashboard composition
- `frontend/src/context/AuthContext.jsx`: login/logout state and persistent auth context
- `frontend/src/components/Sidebar.jsx`: navigation and resource selection
- `frontend/src/components/FolderPage.jsx`: folder and URL management UI
- `frontend/src/components/admin/SessionHistory.jsx`: session, security, and device history screen
- `frontend/src/pages/Login.jsx`: login view
- `frontend/src/pages/OtpVerify.jsx`: OTP verification view
- `frontend/src/pages/Settings.jsx`: account settings and preferences

## Notes for production deployment

This app is intended for internal use and should be deployed behind a trusted environment. In production, make sure all of the following are done:

- use a strong `JWT_SECRET`
- use a real MongoDB deployment instead of a local dev database
- restrict CORS to trusted origins only
- enable secure HTTPS and proper reverse-proxy configuration
- protect `.env` files from version control
