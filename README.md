# SupportPilot — Production-Oriented AI Support Platform

SupportPilot is a comprehensive, production-oriented SaaS application designed to manage customer operations and automate resolutions using multi-step tool-using AI agents.

---

## 🚀 System Quick Links

### 📋 Product & Architecture
- [Product Requirements Document (PRD)](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/PRD.md)
- [Architectural Design Blueprint](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/ARCHITECTURE.md)
- [API Route Specifications](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/API.md)

### 🛡️ Security & AI Implementation
- [Security Engineering Shielding](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/SECURITY.md)
- [AI RAG & Multi-Step Agent Logic](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/AI.md)
- [Core JS Concepts (Closures, Hoisting)](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/JAVASCRIPT_CONCEPTS.md)

### ⚙️ Operations & Verification
- [Testing & Evaluation Setup](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/TESTING.md)
- [Production Deployment Guide](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/DEPLOYMENT.md)
- [Rubric Traceability Index](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/RUBRIC.md)

---

## 🛠️ Tech Stack & Database Architecture

SupportPilot splits data storage to maximize ACID compliance for financials while storing high-frequency metrics efficiently:

- **Frontend**: Next.js App Router, Tailwind CSS, TypeScript, Socket.io-client.
- **Backend API**: Node.js, Express, Socket.IO, Multer, PDF-Parse, node-cron.
- **PostgreSQL (Prisma ORM)**: Stores transactional user accounts, subscriptions, payment logs, orders, and tickets.
- **MongoDB (Mongoose ODM)**: Logs active chats, agent runs, cost analyses, vector chunks, and evaluations.
- **Redis (Cache & Limiter)**: Controls user query rates, caches database order queries, and tracks socket metrics.
- **AI Core**: Google Gemini SDK (Function calling, text embedding, SSE streaming).

---

## 💻 Local Setup Instructions

Ensure you have **Node.js 20+**, **Docker Desktop**, and **Git** installed on your workstation.

### Step 1: Install Dependencies
```bash
# Install Backend Packages
cd backend
npm install

# Install Frontend Packages
cd ../frontend
npm install
```

### Step 2: Initialize Database and Seed Data
Set up local PostgreSQL database configuration, apply migrations, and seed mock entities:
```bash
cd backend
npx prisma migrate dev --name init
npm run prisma:seed
```

### Step 3: Run Development Server
```bash
# Run Backend Server (Starts port 5000)
npm run dev

# Run Frontend Dashboard (Starts port 3000)
cd ../frontend
npm run dev
```

### Step 4: Run Tests & AI Evaluations
```bash
# Run unit and API integration tests
cd backend
npm run test

# Execute LLM Evaluation Suites
npm run evaluate
```

---

## 🐳 Docker Deployment
To spin up all services (PostgreSQL, MongoDB, Redis, API Backend, Next.js Frontend) in unified containers:
```bash
docker compose up --build -d
```
All resources will compile automatically, checking PostgreSQL ready statuses before booting the API layer.
