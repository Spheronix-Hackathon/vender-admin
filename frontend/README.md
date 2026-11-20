# Hackathon Analytics Dashboard

A production-ready analytics dashboard for hackathon organizers with a minimal Apple-style UI, real-time updates, and comprehensive analytics.

## Tech Stack

- **Frontend**: Next.js (App Router), Recharts, Framer Motion, TanStack Table
- **Backend**: Node.js, Express, Socket.io, Mongoose
- **Database**: MongoDB Atlas
- **Styling**: Vanilla CSS with Design Tokens (Apple Human Interface Guidelines inspired)

## Features

- **Real-time Dashboard**: Auto-updating KPI cards and charts
- **Student Management**: Filterable, searchable table with registration trends
- **Payment tracking**: Revenue analytics and transaction monitoring
- **Apple UI**: Glassmorphism, system fonts, and fluid animations
- **Modular Architecture**: Scalable backend controllers and reusable frontend components

## Setup Instructions

### Prerequisites

- Node.js (v18+)
- MongoDB Atlas account (or local MongoDB)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/hackathon-analytics-dashboard.git
cd hackathon-analytics-dashboard
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
node seed.js    # (Optional) Seed initial sample data
node clearDb.js # (Optional) Wipe database for fresh start
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```

The application will be available at `http://localhost:3000`.

## Docker Configuration

To run using Docker:
```bash
docker-compose up --build
```

## License
MIT
