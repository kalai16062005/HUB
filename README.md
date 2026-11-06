# Hub

Hub is a shared URL hub for teams, with separate user and administrator experiences.  
Organize links, assign them to users, and manage accounts from one web application.

## 🧰 Tech Stack

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?logo=nodedotjs&logoColor=white)
![Axios](https://img.shields.io/badge/Axios-HTTP-5A29E4?logo=axios&logoColor=white)

## ✨ Key Features

- Browse assigned URLs with search, folders, favorites, pins, and custom order.
- Administer users, URL assignments, and URL metadata.
- Import and export users or URLs using CSV tools.
- Sign in with password and optional TOTP two-factor verification.
- Review sessions, audit logs, URL health, and usage analytics.
- Opt in to URL visit tracking and personal analytics.

## 📸 Project Screenshots

Screenshots are not currently included in the repository. Add screenshots here when available.

## 📁 Project Structure

```text
.
├── backend/          # Express API, routes, models, middleware
├── frontend/src/     # React app, components, pages, hooks
├── package.json
└── README.md
```

## 🚀 Installation & Setup

**Requirements:** Node.js, npm, and a reachable MongoDB instance.

```bash
git clone https://github.com/kalai16062005/HUB.git
cd HUB

cd backend
npm ci

cd ../frontend
npm ci
```

Create the environment files described below before starting the application.

## 🔧 Environment Configuration

Create `backend/.env`:

```dotenv
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hub
JWT_SECRET=replace-with-a-long-random-secret
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=replace-with-a-unique-password
```

`MONGODB_URI` and `JWT_SECRET` are required. The `PORT` defaults to `5000`; the seed credentials are optional and used by the admin seeder.

Create `frontend/.env`:

```dotenv
VITE_API_URL=http://localhost:5000
```

Use your backend's public origin for production. Never put secrets in frontend environment variables or commit `.env` files.

## ▶️ Run the Application

Start the backend in one terminal:

```bash
cd backend
npm run dev
```

Start the frontend in another terminal:

```bash
cd frontend
npm run dev
```

Vite serves the development app at `http://localhost:5173` by default. The API starts after it connects to MongoDB.

To build the frontend, run `npm run build` from `frontend/`. The backend's `npm run start:prod` script builds the frontend and starts the server using `backend/.env.production`.

## 🔐 Admin & Authentication

Passwords are hashed before storage. Sign-in issues a JWT tied to a database session; protected requests require that session to remain active. Admin-only operations check the user's role. Accounts can use TOTP two-factor authentication and may be required to change a temporary password on first login.

Create an initial admin with `npm run seed:admin` from `backend/` (configure the optional seed variables first), or use `POST /api/auth/setup-admin` while no users exist.

## 🔌 API Overview

The Express API is mounted under `/api`. Main route groups:

- `/api/auth` — login, OTP, password change, logout, and session management.
- `/api/admin` and `/api/urls` — user administration and URL management.
- `/api/preferences` — favorites, pins, and URL ordering.
- `/api/health` — URL health status and manual checks.
- `/api/analytics` — consent and personal/admin usage metrics.
- `/api/activity` — consent-based visit activity records.

Protected endpoints expect a bearer JWT. The backend also mounts the admin router at `/api`, so some admin handlers are additionally available without the `/admin` segment.

## 🔭 Future Improvements

Suggestions—not current features:

- Add automated frontend and backend tests.
- Publish an OpenAPI specification for the active endpoints.
- Align frontend authentication requests with the backend's registered session routes.

---

For the full implementation, see the [project source](https://github.com/kalai16062005/HUB).