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

- **Backend:** Node.js, Express, SQLite (built-in `node:sqlite`)
- **Frontend:** React, Vite, React Router, Recharts, Lucide icons

## Getting Started

### Prerequisites

- Node.js 22+ (uses built-in SQLite module)

### 1. Start the backend

```bash
cd backend
npm install
npm run dev
```

API runs at `http://localhost:3001`

### 2. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Default Login

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123` |

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