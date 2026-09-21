# FintechApp — Investment Education App (Belarusian Bonds)

Diploma project: a platform for financial literacy education and investing practice, focused on the Belarusian bond market. It consists of three parts — a mobile app for end users, a web admin panel, and a shared backend API built on PostgreSQL and Firebase.

Users go through a risk-profiling flow, study investing courses, practice on a demo account with a virtual balance (trades executed against live crypto-pair quotes from Binance), and receive personalized bond recommendations based on their risk profile.

## Table of Contents

- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running Locally](#running-locally)
- [Database](#database)
- [Deployment](#deployment)
- [Available Scripts](#available-scripts)
- [Security Notes & Known Issues](#security-notes--known-issues)

## Key Features

**Mobile app (financeApp)**
- Authentication via Firebase (Google Sign-In)
- Onboarding risk quiz and risk-profile scoring (`conservative` / `moderate` / `aggressive`)
- Demo trading: open leveraged positions (1x, 2x, 5x, 10x), virtual balance, automatic trade closing on a timer, real-time quotes from Binance, candlestick charts
- Bond catalog with computed metrics (yield to maturity, real yield, duration, quality score) and personalized recommendations based on the user's risk profile
- Educational courses and lessons with quizzes and practical tasks; results feed back into the risk profile
- Issuer/company profile pages
- RU/EN localization

**Admin panel (financeApp-admin)**
- Manage users and review their analytics/risk profile
- Manage bonds, issuer companies, courses, and risk-quiz questions
- Manage the list of admins (via Firebase Custom Claims)
- Edit macroeconomic indicators (inflation rate, average deposit rate)
- Built-in code editor (Monaco Editor) for the bond-parser configuration, plus a manual trigger to run the parser
- RU/EN localization

**Backend (financeApp-backend)**
- REST API on Express with Firebase ID token verification (regular and admin-level auth)
- Data stored in PostgreSQL (users, trades, analytics, risk profiles, bonds, companies, macro data); course/lesson content lives in Firestore
- Automated bond data collection and parsing (Cheerio) with financial-metric calculation and scheduled updates via cron
- Binance API integration for live quotes
- Background service that auto-closes open demo trades

## Tech Stack

| Part | Technologies |
|---|---|
| Mobile app | React Native 0.81, Expo SDK 54, Expo Router, TypeScript, Redux Toolkit, TanStack Query, React Navigation, React Native Paper, react-native-wagmi-charts, Firebase JS SDK, Google Sign-In, i18next |
| Admin panel | React 18, TypeScript, Vite, React Router, Firebase JS SDK, Axios, Monaco Editor, i18next, Cloudinary (image uploads) |
| Backend | Node.js, Express 5, TypeScript (tsx), PostgreSQL (`pg`), Firebase Admin SDK, node-cron, Cheerio, Axios, JSON Web Token |

## Project Structure

```
FintechApp/
├── financeApp/                 # mobile app (React Native + Expo)
│   ├── src/
│   │   ├── api/                # HTTP client (axios) that attaches the Firebase token
│   │   ├── app/                # expo-router screens: (tabs) — courses, bonds, account, candlestickChart; login, risk-test
│   │   ├── components/         # bond, lesson, and toast components
│   │   ├── firebase/           # Firebase init, Google sign-in
│   │   ├── i18n/                # ru/en translations
│   │   ├── screens/             # bond and chart screens
│   │   ├── services/bonds/      # client-side bond logic
│   │   ├── store/                # Redux Toolkit: bonds, demoAccount, price, trade, theoryAnalytics
│   │   └── theme/                 # UI theme
│   ├── app.json, eas.json        # Expo / EAS Build configuration
│   └── package.json
├── financeApp-admin/            # admin panel (React + Vite + TS)
│   └── src/
│       ├── api/                  # HTTP client to the backend
│       ├── components/           # AuthContext, Layout, ThemeContext
│       ├── firebase/              # Firebase init, image upload helpers
│       ├── i18n/                   # ru/en translations
│       └── pages/                  # Users, Bonds, Companies, Courses, Questions, Macro, Admins, ParseConfig, Login
├── financeApp-backend/            # backend API (Node.js + Express + TypeScript)
│   └── src/
│       ├── routes/                 # user, trades, riskProfile, bonds, companies, admin
│       ├── services/                # binanceService, bondMetrics, bondsCron, macroService, tradeResolver, updateBonds
│       ├── middleware/               # auth (Firebase token verification), adminAuth
│       ├── firebase/                  # Firebase Admin SDK init
│       ├── db.ts, env.ts, index.ts     # DB connection, env config, entry point
│       └── migrate.ts, migrate_update.ts # DB schema creation/updates
├── package.json                      # root monorepo file
└── README.md
```

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (local or hosted)
- A Firebase project (Authentication + Firestore, plus the ability to create a Service Account)
- Expo CLI / EAS CLI to build the mobile app (`npm install -g eas-cli`)
- A Cloudinary account (for image uploads in the admin panel)
- Android Studio / Xcode — optional, for building and running native versions of the mobile app

## Installation

Clone the repository and install dependencies for each of the three parts separately (they are independent Node.js projects):

```bash
git clone <repository_URL>
cd FintechApp

# backend
cd financeApp-backend
npm install
cd ..

# mobile app
cd financeApp
npm install
cd ..

# admin panel
cd financeApp-admin
npm install
cd ..
```

## Environment Variables

Each part of the project uses its own `.env` file in its folder. Only variable names are listed below — keep actual values (keys, passwords, connection strings) in `.env` and never publish them.

**`financeApp-backend/.env`**

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:password@host:5432/dbname` |
| `FIREBASE_SERVICE_ACCOUNT` | JSON credentials for the Firebase service account (Admin SDK) |
| `PORT` | Port the Express server listens on (defaults to 3000) |

**`financeApp/.env`**

| Variable | Description |
|---|---|
| `FIREBASE_API_KEY` | Firebase Web API Key |
| `FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `FIREBASE_APP_ID` | Firebase App ID |

**`financeApp-admin/.env`**

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API URL (e.g. `http://localhost:3000` for development) |
| `VITE_FIREBASE_API_KEY` | Firebase Web API Key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth Domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage Bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase App ID |
| `VITE_CLOUDINARY_URL` | URL used to upload images via Cloudinary |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Cloudinary upload preset |

## Running Locally

**Backend** (runs on `http://localhost:3000` by default):

```bash
cd financeApp-backend
npm run dev
```

**Mobile app** (Expo):

```bash
cd financeApp
npm run start        # standard start (Expo Dev Tools)
npm run lan          # start with local network access
npm run tunnel       # start via tunnel (for testing outside the local network)
npm run web          # start the web build
```

**Admin panel**:

```bash
cd financeApp-admin
npm run dev
```

By default the panel opens on the port Vite prints (usually `http://localhost:5173`).

## Database

The PostgreSQL schema is created — and fully recreated — by the migration script (note: it drops existing tables before creating new ones; do not run it against a production database with real data without a backup):

```bash
cd financeApp-backend
npm run migrate
```

Tables created: `users`, `courses`, `lessons`, `tasks`, `questions`, `admins`, `bonds`, `macro_data`, `trades`, `trade_analytics`, `risk_profiles`, `companies`, `app_config`, `risk_profile_questions`, `risk_profile_options`, `user_risk_test_responses`, `lesson_quiz_results`, `lesson_task_results`. Course and lesson content is not stored in PostgreSQL — it lives in Firestore.

For incremental schema updates without a full rebuild, use `financeApp-backend/src/migrate_update.ts` (run via `tsx`).

Bond data can be refreshed manually with:

```bash
npm run update:bonds
```

## Deployment

Based on the backend code (`db.ts` enables SSL when the connection string contains `railway`), the project is set up to be hosted on **Railway** (backend + managed PostgreSQL). Below is the general deployment flow for each part.

### Backend (Railway / Render / any Node.js host)

1. Create a service from the repository and add a PostgreSQL plugin (or connect an external database).
2. Set environment variables on the host: `DATABASE_URL` (usually provided automatically by the DB plugin), `FIREBASE_SERVICE_ACCOUNT`, `PORT`.
3. Build command: `npm run build` (compiles TypeScript into `dist/`).
4. Start command: `npm run start` (runs `dist/index.js`). For debugging on the server you can temporarily use `npm run dev`.
5. After the first deploy, run the database migration once: `npm run migrate` (via the host's built-in console or a temporary shell).
6. Check the `GET /health` endpoint — it should return `{"status":"ok"}`.

### Admin panel (Vercel / Netlify / Railway static)

1. Build command: `npm run build` (outputs static files to `dist/`).
2. Set `VITE_API_URL` to point to the public backend URL.
3. Set the remaining `VITE_FIREBASE_*` and `VITE_CLOUDINARY_*` environment variables on the host.
4. Publish the contents of `dist/` as a static site.

### Mobile app (Expo / EAS Build)

1. Build the app: `npm run build` (builds a development-profile Android build via EAS), or configure a separate `production` profile in `eas.json`.
2. **Important**: before building for a real device or production, update `financeApp/src/api/index.ts` — `BASE_URL` is currently hardcoded to a local IP address (`http://192.168.0.106:3000`), which only works on your local Wi-Fi network. Replace it with the public backend URL (e.g. via `expo-constants`/`app.json → extra` or an environment variable), otherwise the built app won't be able to reach the server.
3. Configure Firebase (Google Sign-In) for the production build: add the release build's SHA certificates in the Firebase/Google Cloud console.

### Pre-deployment checklist

- [ ] Replaced the hardcoded local IP in `financeApp/src/api/index.ts` with the production backend URL
- [ ] All backend environment variables are set on the host (`DATABASE_URL`, `FIREBASE_SERVICE_ACCOUNT`, `PORT`)
- [ ] `VITE_API_URL` and the remaining `VITE_*` variables are set on the admin panel host
- [ ] The database migration (`npm run migrate`) has been run against the production database
- [ ] The backend builds successfully (`npm run build`) with no TypeScript errors
- [ ] Authorized domains and OAuth redirect settings in the Firebase Console include the production domains
- [ ] CORS on the backend (currently open to all origins via `cors()`) is restricted to specific domains if needed
- [ ] Secrets (`.env` files, Firebase Service Account keys) are not committed to the repository — see the section below

## Available Scripts

**financeApp-backend**

| Command | Description |
|---|---|
| `npm run dev` | Run the server in development mode (`tsx src/index.ts`) |
| `npm run build` | Compile TypeScript into `dist/` |
| `npm run start` | Run the built server (`node dist/index.js`) |
| `npm run migrate` | Fully rebuild the database schema |
| `npm run update:bonds` | Manually run the bond data parser/updater |

**financeApp**

| Command | Description |
|---|---|
| `npm run start` | Launch Expo Dev Tools |
| `npm run lan` | Start with local network access |
| `npm run tunnel` | Start via Expo tunnel |
| `npm run android` / `npm run ios` | Run on Android/iOS via `expo run` |
| `npm run web` | Run the web build |
| `npm run lint` | Run the linter |
| `npm run build` | Build via EAS (development profile, Android) |

**financeApp-admin**

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build (`tsc && vite build`) |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run the linter |

## Security Notes & Known Issues

- `financeApp/.gitignore` only ignores `.env*.local`, not the `.env` file itself — make sure `financeApp/.env` isn't already committed to git history, or add `.env` to the ignore list.
- `financeApp-admin` has no `.gitignore` file at all — `node_modules/` and `.env` (containing Firebase and Cloudinary keys) are unprotected from accidental commits. Add a `.gitignore` with at least `node_modules/` and `.env` before publishing the repository.
- `financeApp-backend/.gitignore` already correctly ignores `.env`, `node_modules/`, and `dist/`.
- Before a public release, rotate any keys/secrets that may have previously ended up in the git history.

## Author

Diploma project. Author: add your name and contact info (e.g. a link to your GitHub profile) before publishing the repository.
