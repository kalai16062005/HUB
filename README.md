# Hub

Hub is a React web application and Express API for organizing a team's shared URLs. Administrators manage users and URL records; signed-in users browse the URLs assigned to them, organize their personal view, and can opt in to usage tracking.

## Project overview

The application is split into a Vite-powered React frontend and a Node.js/Express backend. The backend stores users, URLs, sessions, preferences, audit entries, and opted-in activity records in MongoDB through Mongoose. The frontend calls the backend over HTTP using the `VITE_API_URL` setting (most components default to `http://localhost:5000`).

The backend also serves the built frontend from `frontend/dist` when that directory exists. For local development, the frontend and backend are normally run as separate processes.

## Features

- Username and password sign-in, JSON Web Token (JWT) authentication, database-backed sessions, and session revocation.
- Optional time-based one-time password (TOTP) two-factor authentication, including QR-code setup and OTP sign-in.
- First-login password-change flow.
- Admin tools for creating, bulk-creating, deleting, and force-logging-out users.
- URL management with user assignments, folders, categories, tags, descriptions, favicons, and CSV import/export.
- A user URL hub with search, nested folder browsing, favorites, pins, and a saved URL order.
- URL availability checks at startup and every two minutes, plus an admin-triggered check.
- Opt-in visit tracking and personal/admin analytics, including URL, user, team, trend, and hourly summaries.
- Admin audit-log and session-history views.
- An iframe payload testing view.

## Technologies

| Area | Technologies |
|---|---|
| Frontend | React 19, React Router 7, Vite 8, Axios, Lucide React |
| Backend | Node.js, Express 5, Mongoose 9, MongoDB |
| Authentication and security | `jsonwebtoken`, `bcryptjs`, `speakeasy`, `qrcode`, `ua-parser-js` |
| Other backend dependencies | `cors`, `dotenv`, `dotenv-cli`, `uuid`, `node-cron`, `node-fetch` |
| Frontend development | `@vitejs/plugin-react`, ESLint and React ESLint plugins |

The dependency lists and lockfiles are in `frontend/` and `backend/`. The root `package.json` has no scripts and declares only `uuid`; install each application package separately as described below. `node-cron` and `node-fetch` are listed in the backend manifest but are not imported by the current backend JavaScript files.

## Frontend architecture

`frontend/src/main.jsx` mounts the React application and authentication provider. `frontend/src/App.jsx` defines the React Router routes, protected dashboard views, and navigation. Authentication state and shared Axios authorization are managed in `frontend/src/context/`; `frontend/src/hooks/` contains reusable polling and idle-logout helpers.

The frontend includes:

- Login, OTP verification, QR setup, password change, and account settings screens.
- URL browsing, selection, nested folders, and the shared sidebar.
- Admin views for users, URLs, analytics, audit logs, session history, and iframe testing.
- A consent prompt and visit tracking that submits activity only when tracking consent is enabled.

Most API requests use Axios and `VITE_API_URL`; the OTP and QR setup flows also use `fetch`. Some components use the localhost default when `VITE_API_URL` is unset, while a few read the variable directly. `frontend/src/pages/QrSetup.jsx` uses a hard-coded localhost API URL.

The application currently requests `GET /api/auth/me` and `GET /api/auth/sessions/me` in some frontend code, but those paths are not registered by the backend. The backend registers `GET /api/auth/sessions` instead. The standalone `frontend/src/pages/Security.jsx` and `frontend/src/components/admin/ActivityViewer.jsx` files are present but are not the components rendered by the corresponding current dashboard routes.

## Backend architecture

`backend/server.js` configures Express, CORS, JSON parsing, API route mounts, static frontend serving, and the MongoDB connection. The server calls `app.listen()` only after MongoDB connects; if the database connection fails, the API does not start listening.

The backend is organized into:

- `routes/`: authentication, admin/user and URL management, preferences, health checks, and analytics.
- `middleware/`: bearer-token/session checks, administrator authorization, and audit-log creation.
- `models/`: Mongoose schemas for users, URLs, sessions, preferences, activity, and audit logs.
- `scripts/`: the optional initial-admin seeder.
- `utils/`: TOTP and QR-code helpers.

The health worker runs once after database connection and then every two minutes. It records URL health status and check timestamps in MongoDB.

## Project structure

The tree below shows the source and configuration files tracked in the repository. Dependency directories, local `.env` files, and generated build output are intentionally omitted.

```text
.
├── .gitignore
├── README.md
├── package.json
├── package-lock.json
├── backend/
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   ├── middleware/
│   │   ├── audit.js
│   │   ├── auth.js
│   │   └── checkSession.js
│   ├── models/
│   │   ├── ActivityLog.js
│   │   ├── AuditLog.js
│   │   ├── Session.js
│   │   ├── Url.js
│   │   ├── User.js
│   │   └── UserPreference.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── analytics.js
│   │   ├── auth.js
│   │   ├── health.js
│   │   ├── preferences.js
│   │   └── twofa.js
│   ├── scripts/
│   │   └── seedAdmin.js
│   └── utils/
│       └── totp.js
└── frontend/
    ├── .gitignore
    ├── eslint.config.js
    ├── index.html
    ├── package.json
    ├── package-lock.json
    ├── README.md
    ├── vite.config.js
    ├── public/
    │   ├── favicon.svg
    │   └── icons.svg
    └── src/
        ├── App.css
        ├── App.jsx
        ├── index.css
        ├── main.jsx
        ├── assets/
        │   ├── hero.png
        │   ├── hub-company.png
        │   └── hub-hub.png
        ├── components/
        │   ├── AddUrlModal.jsx
        │   ├── FolderPage.jsx
        │   ├── MainViewer.jsx
        │   ├── Sidebar.jsx
        │   ├── TrackingConsentBanner.jsx
        │   ├── TwoFASetupBannerPage.jsx
        │   └── admin/
        │       ├── ActivityViewer.jsx
        │       ├── AddUserModal.jsx
        │       ├── AnalyticsDashboard.jsx
        │       ├── AuditLogViewer.jsx
        │       ├── BulkUploadModal.jsx
        │       ├── IframePayloadTester.jsx
        │       ├── SessionHistory.jsx
        │       ├── UrlManagement.jsx
        │       └── UserManagement.jsx
        ├── context/
        │   ├── AuthContext.jsx
        │   ├── AuthContextValue.js
        │   └── useAuth.js
        ├── hooks/
        │   ├── useIdleLogout.js
        │   └── usePolling.js
        └── pages/
            ├── ChangePassword.jsx
            ├── Login.jsx
            ├── OtpVerify.jsx
            ├── QrSetup.jsx
            ├── Security.jsx
            └── Settings.jsx
```

## Requirements

- Node.js and npm.
- A MongoDB instance that the backend can reach, either local or hosted.
- Git to clone the repository.

The package manifests do not specify a Node.js engine version. Use a current Node.js release compatible with the locked Vite and Mongoose dependencies.

## Installation and setup

Clone the repository and install the frontend and backend dependencies from their respective directories:

```bash
git clone https://github.com/kalai16062005/HUB.git
cd HUB

cd backend
npm ci

cd ../frontend
npm ci
```

Create local environment files as described below. Do not commit `.env` files or put real credentials in source control.

### Environment variables

The backend loads `backend/.env` when `server.js` starts. The production script uses `backend/.env.production`. Create the relevant file locally and fill in your own values:

```dotenv
# backend/.env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hub
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development

# Optional: used by npm run seed:admin
SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=replace-with-a-unique-password
```

| Variable | Purpose |
|---|---|
| `PORT` | Backend listen port; defaults to `5000` if unset. |
| `MONGODB_URI` | Required MongoDB connection string. |
| `JWT_SECRET` | Secret used to sign and verify login tokens. |
| `NODE_ENV` | Present in the environment files; the server does not use it to select routes or runtime behavior. |
| `SEED_ADMIN_USERNAME` | Optional username read by the admin seeder. |
| `SEED_ADMIN_PASSWORD` | Optional password read by the admin seeder. Set it before running the seeder; the script has a built-in fallback if it is omitted. |

The frontend reads `VITE_API_URL` at build/dev-server time. The localhost fallback used by most components is shown here:

```dotenv
# frontend/.env
VITE_API_URL=http://localhost:5000
```

For production, set `VITE_API_URL` in `frontend/.env.production` to the backend's public origin before building. Vite embeds `VITE_` variables in frontend code, so do not put secrets in frontend environment variables. The backend's CORS allowlist is configured in `backend/server.js`; a custom frontend origin must be allowed there.

## Run the frontend

In a terminal from the repository root:

```bash
cd frontend
npm ci
npm run dev
```

Vite starts its development server (by default at `http://localhost:5173`). Keep this process running while developing.

Available frontend scripts:

```bash
npm run build    # Create the production bundle in frontend/dist
npm run lint     # Run ESLint
npm run preview  # Serve the built bundle locally
```

There is no frontend test script in the package manifest.

## Run the backend

In a second terminal:

```bash
cd backend
npm ci
npm run dev
```

The development script loads `backend/.env` and starts the server with Nodemon. Ensure MongoDB is reachable and `MONGODB_URI` and `JWT_SECRET` are set. The API does not listen until its MongoDB connection succeeds.

To create an initial admin using the seeder:

```bash
cd backend
npm run seed:admin
```

Set `SEED_ADMIN_USERNAME` and `SEED_ADMIN_PASSWORD` in `backend/.env` before running it. The seeder skips creation if that username already exists. Alternatively, `POST /api/auth/setup-admin` creates the first admin only while the user collection is empty.

The production script builds the frontend and starts the backend using `backend/.env.production`:

```bash
cd backend
npm run start:prod
```

## API documentation

All active routes are mounted by `backend/server.js`. Protected routes expect a JWT sent as a bearer token in the `Authorization` request header.

The examples below use `/api/admin/...` for administrator-management routes. The same router is also mounted at `/api`, so those routes are additionally available without the `/admin` segment (for example, both `/api/admin/users` and `/api/users` reach the user-list handler).

### Authentication and sessions

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Verify username and password; may request an OTP or return a login token. |
| `POST` | `/api/auth/login-otp` | Public | Verify a TOTP code and create a session for a 2FA-enabled account. |
| `POST` | `/api/auth/setup-admin` | Public, only when no users exist | Create the initial administrator and session. |
| `POST` | `/api/auth/setup` | Signed-in session | Generate a QR code for setting up 2FA. |
| `POST` | `/api/auth/verify` | Signed-in session | Verify the OTP and enable 2FA. |
| `POST` | `/api/auth/change-password` | Authenticated | Set a new password and clear the forced-change flag. |
| `POST` | `/api/auth/logout` | Signed-in session | Mark the current session inactive. |
| `GET` | `/api/auth/sessions` | Signed-in session | List sessions; administrators see all sessions and users see their own. |
| `DELETE` | `/api/auth/sessions/user/:id` | Admin or the matching user | Delete sessions for a user. |
| `DELETE` | `/api/auth/sessions/:id` | Admin or session owner | Delete one session. |
| `DELETE` | `/api/auth/sessions/logout-others` | Signed-in session | Mark the user's other active sessions inactive. |

`DELETE /api/auth/sessions/logout-others` is declared after the parameterized `DELETE /api/auth/sessions/:id` route. Because the parameterized route may match first, verify this endpoint before relying on it.

### Users and URLs

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/admin/users` | Admin | List users without password hashes. |
| `POST` | `/api/admin/users` | Admin | Create a user and return a temporary password. |
| `POST` | `/api/admin/users/bulk` | Admin | Create users from a JSON `users` array. |
| `DELETE` | `/api/admin/users/:id` | Admin | Delete a user. |
| `POST` | `/api/admin/users/:id/force-logout` | Admin | Mark the user's active sessions inactive. |
| `GET` | `/api/admin/users/export-csv` | Admin | Download users as CSV. |
| `GET` | `/api/urls` | Authenticated | List all URLs for admins or assigned URLs for users. |
| `POST` | `/api/urls` | Admin | Create a URL, optionally assigning users and setting tags/folder/category/description. |
| `PUT` | `/api/urls/:id` | Admin | Update a URL and its metadata/assignments. |
| `DELETE` | `/api/urls/:id` | Admin | Delete a URL. |
| `GET` | `/api/urls/export-csv` | Admin | Download URLs and assignment/health metadata as CSV. |
| `POST` | `/api/urls/bulk` | Admin | Create URLs from a JSON `urls` array; assignments are matched by username. |
| `POST` | `/api/urls/:id/refresh-favicon` | Admin | Fetch and store the URL's favicon again. |

### Preferences and health

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/preferences` | Signed-in session | Load or create the user's favorites, pins, and URL order. |
| `PATCH` | `/api/preferences/favorite/:urlId` | Signed-in session | Toggle a URL favorite. |
| `PATCH` | `/api/preferences/pin/:urlId` | Signed-in session | Toggle a URL pin. |
| `PATCH` | `/api/preferences/order` | Signed-in session | Save a `urlOrder` array of URL IDs. |
| `GET` | `/api/health/status` | Authenticated | Get URL health data; non-admin users see assigned URLs. |
| `POST` | `/api/health/ping/:id` | Admin | Check one URL immediately and update its health record. |

### Activity and analytics

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/activity/start` | Authenticated | Start an activity record when the user has opted in to tracking. |
| `PUT` | `/api/activity/end/:id` | Authenticated | Record the end time and duration for an activity. |
| `GET` | `/api/activity` | Admin | List recent activity records. |
| `POST` | `/api/analytics/consent` | Authenticated | Save the user's tracking consent (`consent: true` or `false`). |
| `GET` | `/api/analytics/my-consent` | Authenticated | Read the current user's tracking consent. |
| `GET` | `/api/analytics/my-stats` | Authenticated | Get the current user's activity statistics; accepts `period`. |
| `GET` | `/api/analytics/summary` | Admin | Get overall activity totals and today's views. |
| `GET` | `/api/analytics/top-urls` | Admin | Rank URLs by activity; accepts `limit` and `period`. |
| `GET` | `/api/analytics/user-usage` | Admin | Aggregate usage by user; accepts `period`. |
| `GET` | `/api/analytics/team-usage` | Admin | Aggregate usage by team; accepts `period`. |
| `GET` | `/api/analytics/trends` | Admin | Return daily activity trends; accepts `period`. |
| `GET` | `/api/analytics/hourly` | Admin | Return hourly activity counts; accepts `period`. |
| `PATCH` | `/api/analytics/user-team` | Admin | Update a user's team using `username` and `team`. |

Analytics period parameters are interpreted by each handler; commonly used values are `week`, `month`, and `all`. Defaults differ by endpoint.

The file `backend/routes/twofa.js` contains a separate set of 2FA handlers, but `server.js` does not mount that router. Those handlers are not active API endpoints. The active 2FA setup, verification, and login routes are under `/api/auth`.

## Authentication and authorization

Passwords are hashed with `bcryptjs` by a Mongoose pre-save hook. Login creates a database session and signs a JWT with `JWT_SECRET`; the token expires after 30 days. Authenticated requests send the token as a bearer token. The backend checks the token and its session record, and the `adminOnly` middleware restricts administrative handlers to users whose role is `admin`.

For accounts with 2FA enabled, the login flow requires an OTP before creating a session. The session endpoints support listing and revoking sessions, and the UI includes an option to end other sessions. New non-admin users may be required to change their temporary password at first login.

## Database configuration and models

MongoDB is configured through `MONGODB_URI`. Mongoose connects before the HTTP server begins listening. The application defines these MongoDB models:

| Model | Stored data |
|---|---|
| `User` | Username, hashed password, role, 2FA state, team, password-change flag, and tracking consent. |
| `Session` | User, session identifier, IP/device information, activity timestamps, and active/inactive status. |
| `Url` | URL name/address, assignments, folder/category/tags/description, favicon, and health-check state. |
| `UserPreference` | Per-user favorites, pins, and custom URL ordering. |
| `ActivityLog` | Opt-in URL visit records and duration. |
| `AuditLog` | Recorded administrative and authentication actions. |

The repository does not include database migrations or a database backup.

## Application workflow

1. Configure MongoDB and the backend environment, then start the backend. It connects to MongoDB before listening.
2. Create the first admin with the seed script or, while the user collection is empty, the setup-admin endpoint.
3. Start the frontend and sign in. The backend creates a session and returns a JWT used for authenticated API requests.
4. An administrator creates users and manages URLs, assignments, and URL metadata.
5. Users browse URLs assigned to them and save favorites, pins, and ordering preferences.
6. Users may configure 2FA and choose whether to enable usage tracking. Activity records are created only after consent.
7. Administrators can review sessions, audit entries, health status, and analytics. URL health checks also run in the backend worker.

## Troubleshooting

- **Backend connection refused:** Check that MongoDB is available and `MONGODB_URI` is correct. The backend only calls `app.listen()` after MongoDB connects. Also check that `PORT` is not already in use.
- **Frontend cannot reach the API:** Set `VITE_API_URL` to the backend origin, restart Vite after changing environment variables, and ensure the frontend origin is permitted by the CORS allowlist in `backend/server.js`.
- **401 Unauthorized:** Sign in again and check that the request includes a valid bearer JWT. The server also checks that the session remains active.
- **403 Forbidden:** The route may require the `admin` role or ownership of the requested session.
- **404 on `/api/auth/me` or `/api/auth/sessions/me`:** These paths are used by some frontend code but are not registered in the current backend. The backend's session-list route is `/api/auth/sessions`.
- **Admin page or URL data missing:** Confirm that the signed-in user has the intended role and that URLs are assigned to the user; non-admin URL listing is assignment-scoped.
- **Build or lint issues:** Run `npm ci` in the affected package directory, then run `npm run build` or `npm run lint` from `frontend/`.

## Contributing

No repository-specific contribution guide is currently included. A helpful contribution should describe the issue or change, keep frontend and backend changes scoped, avoid committing local environment files or credentials, and include relevant verification steps. Frontend linting is available with `npm run lint` from `frontend/`; no automated test suite is configured in the package manifests.

## Future enhancements (suggestions only)

The following are ideas, not features currently claimed by this README:

- Add automated backend and frontend tests.
- Publish an OpenAPI specification for the active API.
- Align the frontend's `/api/auth/me` and `/api/auth/sessions/me` requests with registered backend routes.
- Make the QR setup request use the configured API base URL.
- Add pagination and filtering to administrative tables and activity endpoints.

## License

`backend/package.json` declares the ISC license for the backend package. No repository-level `LICENSE` file is present, so licensing for the project as a whole is not explicitly documented.
