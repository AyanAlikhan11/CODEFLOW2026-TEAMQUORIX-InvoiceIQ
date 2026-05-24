# InvoiceIQ — AI-Powered Invoice Intelligence Platform

InvoiceIQ is a production-grade AI fintech platform for intelligent invoice processing, real-time fraud detection, GST analytics, spending predictions, and automated financial insights. Built with **Next.js 16**, **Firebase Auth & Firestore**, and powered by **Google Gemini AI**.

## Features

### Authentication (Firebase)
- **Email/Password Sign-up & Login** — with email verification support
- **Google OAuth** — one-click sign-in with Google accounts
- **Password Reset** — self-service password recovery via email
- **Session Management** — secure session cookies with 7-day expiry
- **Account Deletion** — full account and data removal

### AI-Powered Dashboard
- **Real-time Spending Overview** — stat cards, spending charts, and trend analysis
- **AI Chat Assistant** — ask questions about your invoices, spending, and financial health
- **Fraud Detection** — automatic fraud scoring and alerts for suspicious invoices
- **GST Analytics** — automatic CGST/SGST/IGST breakdown by category
- **Spending Predictions** — AI-powered monthly spending forecasts
- **Financial Health Score** — composite score based on spending, savings, consistency, and fraud risk
- **Category & Merchant Analytics** — deep-dive into where your money goes

### Invoice Management
- **Upload & Scan** — upload invoices for AI-powered OCR extraction
- **Invoice List** — view, search, and filter all processed invoices
- **Duplicate Detection** — automatic duplicate invoice identification
- **Smart Categorization** — AI-powered category and sub-category assignment

### Budget Tracking
- **Category Budgets** — set monthly or quarterly budgets per category
- **Budget Alerts** — configurable spending thresholds with notifications
- **Progress Tracking** — visual budget utilization indicators

### Settings & Preferences
- **Profile Management** — update name, company, and avatar
- **Password Management** — change password securely
- **Email Verification** — verify your email for enhanced security
- **Theme Selection** — light, dark, and system theme support
- **Notification Preferences** — control fraud alerts, budget warnings, and weekly summaries
- **Data Export** — download all your data as JSON
- **Account Deletion** — permanently delete your account and all associated data

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **UI Components** | shadcn/ui (New York style) |
| **Styling** | Tailwind CSS 4 + Framer Motion |
| **Authentication** | Firebase Authentication |
| **Database** | Cloud Firestore (user-scoped collections) |
| **File Storage** | Firebase Cloud Storage |
| **AI Engine** | Google Gemini 2.5 Flash |
| **State Management** | Zustand |
| **Icons** | Lucide React |
| **Charts** | Recharts |

---

## Prerequisites

- **Node.js** 18+ or **Bun** 1.0+
- A **Firebase project** with:
  - Authentication enabled (Email/Password + Google providers)
  - Cloud Firestore enabled
  - Firebase Storage enabled
  - A service account with Admin SDK access

---

## Firebase Setup Guide

### Step 1: Get a Google Gemini API Key (Required)

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Copy the key — you'll need this for the `GEMINI_API_KEY` variable

> **Note**: The free tier of Gemini 2.5 Flash gives you 15 RPM (requests per minute), which is more than enough for development and demos.

### Step 2: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** and follow the setup wizard
3. Enable **Google Analytics** (optional but recommended)

### Step 3: Enable Authentication

1. In Firebase Console, go to **Authentication → Get started**
2. Click **"Email/Password"** → Enable it
3. Click **"Google"** → Enable it and add a support email
4. (Optional) Configure email templates under **Authentication → Templates**

### Step 4: Create a Web App

1. Go to **Project Settings** (gear icon) → **General**
2. Under "Your apps", click the **Web icon** (`</>`)
3. Register your app (e.g., "invoiceiq-web")
4. Copy the **firebaseConfig** object — you'll need these values

### Step 5: Set Up Firestore

1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (you can update rules later)
3. Select a location closest to your users

### Step 6: Set Up Storage

1. Go to **Storage** → **Get started**
2. Choose **Start in test mode**
3. Select a location

### Step 7: Generate Service Account Key

1. Go to **Project Settings** → **Service Accounts**
2. Click **"Generate new private key"**
3. Save the downloaded JSON file — you'll need the values from it

### Step 7: Configure Firestore Rules (Recommended)

For development, use test mode. For production, configure rules like:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      // Profile doc: only the user can read/write their own profile
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Sub-collections: same user-only access
      match /{collection}/{docId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## Local Development Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd invoiceiq
bun install
```

### 2. Configure Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your Firebase credentials:

```env
# Google Gemini AI (REQUIRED — get from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSy...

# Firebase Client SDK (from Step 4)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (from Step 7 — service account JSON)
FIREBASE_CLIENT_EMAIL=your-service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n"
```

**Important for `FIREBASE_PRIVATE_KEY`:**
- Copy the entire `private_key` value from the service account JSON
- Wrap it in double quotes in `.env.local`
- The `\n` characters in the JSON key must be preserved as literal `\n`

### 3. Run the Development Server

```bash
bun run dev
```

The app will be available at `http://localhost:3000`.

### 4. Build for Production

```bash
bun run build
bun run start
```

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout with AuthProvider
│   ├── login/page.tsx              # Login page (Firebase Auth)
│   ├── signup/page.tsx             # Sign-up page (Firebase Auth)
│   ├── dashboard/page.tsx          # Main dashboard (auth-protected)
│   └── api/
│       ├── auth/
│       │   ├── login/route.ts      # Email/password + token login
│       │   ├── register/route.ts   # New user registration
│       │   ├── google/route.ts     # Google OAuth handler
│       │   ├── session/route.ts    # Session verification
│       │   ├── session-sync/route.ts  # Client-to-server session sync
│       │   ├── logout/route.ts     # Logout + session revocation
│       │   ├── reset-password/route.ts  # Password reset
│       │   └── profile/route.ts    # Profile CRUD (GET/PATCH/DELETE)
│       ├── chat/route.ts           # AI chat (POST) + history (GET)
│       ├── invoices/route.ts       # Invoice CRUD
│       ├── analytics/route.ts      # Analytics computation
│       ├── predictions/route.ts    # AI spending predictions
│       ├── budget/route.ts         # Budget management
│       ├── fraud/route.ts          # Fraud detection
│       └── health-score/route.ts   # Financial health scoring
├── components/
│   ├── landing/                    # Landing page components
│   ├── layout/                     # Header and Sidebar
│   ├── dashboard/                  # Dashboard view + stat cards
│   ├── chat/                       # AI Chat view
│   ├── invoices/                   # Invoice list view
│   ├── analytics/                  # Analytics view
│   ├── predictions/                # Predictions view
│   ├── upload/                     # Upload & scan view
│   ├── budget/                     # Budget view
│   ├── settings/                   # Settings view
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── firebase.ts                 # Firebase Admin SDK (server)
│   ├── firebase-client.ts          # Firebase Client SDK (browser)
│   ├── auth-context.tsx            # Auth provider + hooks
│   ├── database.ts                 # Unified Firestore data layer
│   ├── utils.ts                    # Utility functions
│   └── ai-enhanced.ts              # AI utility functions
├── store/
│   └── app-store.ts                # Zustand global state
├── types/
│   └── index.ts                    # TypeScript type definitions
└── middleware.ts                   # Route protection middleware
```

### Firestore Data Model

```
users/
  └── {uid}/
      ├── (profile document)        # name, email, company, avatar, role
      ├── invoices/                 # User's invoices
      │   └── {invoiceId}/
      ├── chat_messages/            # AI chat history
      │   └── {messageId}/
      ├── budgets/                  # Budget settings
      │   └── {budgetId}/
      └── fraud_alerts/             # Fraud detection results
          └── {alertId}/
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Sign in with email/password or Firebase ID token |
| POST | `/api/auth/register` | Register new user (creates Firestore profile) |
| POST | `/api/auth/google` | Handle Google OAuth sign-in |
| GET | `/api/auth/session` | Get current authenticated user |
| POST | `/api/auth/session-sync` | Sync Firebase client token to session cookie |
| POST | `/api/auth/logout` | Sign out and revoke session |
| POST | `/api/auth/reset-password` | Request password reset email |
| GET | `/api/auth/profile` | Get user profile |
| PATCH | `/api/auth/profile` | Update user profile (name, company, avatar) |
| DELETE | `/api/auth/profile` | Delete user account and all data |

### Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat` | Get AI chat history |
| POST | `/api/chat` | Send message to AI assistant |
| GET | `/api/invoices` | List all invoices |
| POST | `/api/invoices` | Create new invoice |
| GET/PUT/DELETE | `/api/invoices/[id]` | Invoice CRUD |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key (get from [AI Studio](https://aistudio.google.com/app/apikey)) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | Firebase Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | No | Firebase Cloud Messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | No | Firebase Web App ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Service account email |
| `FIREBASE_PRIVATE_KEY` | Yes | Service account private key |

---

## Common Issues & Troubleshooting

### "GEMINI_API_KEY is not set"
Make sure you've set `GEMINI_API_KEY` in `.env.local` and restarted the server. Get a free API key at https://aistudio.google.com/app/apikey.

### "Gemini API quota exceeded"
The free tier allows 15 requests per minute. If you're uploading many invoices at once, reduce the batch size or wait a minute between batches.

### "Firebase not configured" warning
Make sure all required environment variables are set in `.env.local` and the server has been restarted.

### "Invalid service account" error
- Double-check the `FIREBASE_CLIENT_EMAIL` matches your service account
- Ensure the `FIREBASE_PRIVATE_KEY` includes the `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----` delimiters
- In `.env.local`, wrap the private key in double quotes

### Google Sign-in not working
- Ensure Google provider is enabled in Firebase Console → Authentication → Sign-in method
- Add an authorized domain in Authentication → Settings → Authorized domains

### Session cookies not persisting
- Session cookies require HTTPS in production
- In development, cookies are set without the `Secure` flag
- Check browser settings if third-party cookies are blocked

### Firestore permission denied
- Verify Firestore rules allow read/write for authenticated users
- Check that the service account has the "Cloud Firestore Admin" role

---

## License

MIT
