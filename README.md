# Wise Web

Small Next.js testing app for the Wise backend API.

## Setup

Create a Firebase Web App in the Firebase console, enable Google sign-in, then copy the web config into `.env.local`.

```bash
cp .env.local.example .env.local
```

Required values:

```env
NEXT_PUBLIC_APP_ENV=local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=wise-money-499410
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_WISE_API_BASE_URL=http://localhost:8080
```

Make sure Firebase Auth has Google provider enabled and `localhost` is listed as an authorized domain.

Environment templates:

```text
.env.local.example       local Next.js against local API
.env.production.example  production Next.js against production Cloud Run
```

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## What It Tests

- Google sign-in through Firebase Auth
- Firebase ID token retrieval
- `POST /wallet/accounts/customer`
- `GET /wallet/accounts`
- `POST /wallet/transfers`
