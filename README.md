# QueueFlow — Queue Management Application

A full-stack queue management system for managers to create queues, issue tokens, reorder waiting customers, serve the next person, and view analytics.

## Features

- **Manager login** with JWT authentication
- **Create named queues** and manage multiple queues
- **Add tokens** — each person gets an auto-incremented token number
- **View waiting list** with live position and wait time
- **Reorder tokens** — move up/down in the queue
- **Serve next** — assign the top token for service with one click
- **Cancel tokens** — remove a person from the waiting queue
- **Analytics dashboard** — wait times, queue length trends, hourly volume, recent activity

## Tech Stack

- **Backend:** Node.js, Express, Turso/libSQL (SQLite-compatible cloud DB)
- **Frontend:** React, Vite, React Router, Recharts, Lucide icons
- **Deployment:** Vercel (frontend + serverless API)

## Local Development

### Prerequisites

- Node.js 18+

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Start the backend

```bash
cd backend
npm run dev
```

API runs at `http://localhost:3001` (uses a local SQLite file automatically)

### 3. Start the frontend

```bash
cd frontend
npm run dev
```

App runs at `http://localhost:5173`

### Default Login

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123` |

---

## Deploy to Vercel

Vercel cannot persist a local SQLite file — you need a free [Turso](https://turso.tech) database for production.

### Step 1: Create a Turso database

1. Sign up at [turso.tech](https://turso.tech)
2. Install the Turso CLI and create a database:

```bash
turso db create queueflow
turso db show queueflow --url
turso db tokens create queueflow
```

Save the **Database URL** and **Auth Token**.

### Step 2: Push to GitHub

```bash
git init
git add .
git commit -m "Queue management app"
git remote add origin https://github.com/YOUR_USERNAME/queue-manager.git
git push -u origin main
```

### Step 3: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Set the **Root Directory** to `queue-manager` (if the repo root is the parent folder, use `.` instead)
4. Vercel auto-detects settings from `vercel.json` — no changes needed
5. Add these **Environment Variables**:

| Variable | Value |
|----------|-------|
| `TURSO_DATABASE_URL` | `libsql://your-db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | Your Turso auth token |
| `JWT_SECRET` | A long random secret string |

6. Click **Deploy**

Your app will be live at `https://your-project.vercel.app`

### Step 4: Verify

- Open your Vercel URL
- Login with `admin` / `admin123`
- Create a queue and add tokens

> The default admin user is seeded automatically on first API request when the database is empty.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Manager login |
| GET | `/api/queues` | List all queues |
| POST | `/api/queues` | Create a queue |
| GET | `/api/queues/:id` | Get queue with waiting tokens |
| DELETE | `/api/queues/:id` | Delete a queue |
| POST | `/api/queues/:id/tokens` | Add a token |
| POST | `/api/queues/:id/tokens/:tokenId/move-up` | Move token up |
| POST | `/api/queues/:id/tokens/:tokenId/move-down` | Move token down |
| POST | `/api/queues/:id/serve-next` | Serve top token |
| POST | `/api/queues/:id/tokens/:tokenId/cancel` | Cancel a token |
| GET | `/api/analytics` | Dashboard analytics |

## Project Structure

```
queue-manager/
├── api/index.js          # Vercel serverless entry point
├── backend/src/          # Express API
├── frontend/             # React app
├── vercel.json           # Vercel deployment config
└── .env.example          # Environment variable template
```