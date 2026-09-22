# FintechApp — Investment Education App (Belarusian Bonds)

Diploma project: a platform for financial literacy education and investing practice, focused on the Belarusian bond market. Users go through a risk-profiling flow, study investing courses, practice on a demo account with a virtual balance (trades executed against live crypto-pair quotes from Binance), and receive personalized bond recommendations based on their risk profile.

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
- Android Studio — for building and running native versions of the mobile app

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

**Backend**:

```bash
cd financeApp-backend
npm run dev
```

**Mobile app** (Expo):

```bash
cd financeApp
npm run start        # standard start (Expo Dev Tools)
npm run tunnel       # start via tunnel (for testing outside the local network)
```

**Admin panel**:

```bash
cd financeApp-admin
npm run dev
```

## Database

The PostgreSQL schema is created — and fully recreated — by the migration script (note: it drops existing tables before creating new ones; do not run it against a production database with real data without a backup):

```bash
cd financeApp-backend
npm run migrate
```

Tables created: `users`, `courses`, `lessons`, `tasks`, `questions`, `admins`, `bonds`, `macro_data`, `trades`, `trade_analytics`, `risk_profiles`, `companies`, `app_config`, `risk_profile_questions`, `risk_profile_options`, `user_risk_test_responses`, `lesson_quiz_results`, `lesson_task_results`. Course and lesson content is not stored in PostgreSQL — it lives in Firestore.

## Preview

https://youtu.be/vCzYzoSwLKI
