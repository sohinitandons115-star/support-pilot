# SupportPilot Rubric Traceability Matrix

This document maps all required rubric criteria to their respective implementation details, file paths, and verification scripts in the SupportPilot platform.

---

## 1. AI & LLM Engineering

### Function Calling / Tool Use
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L43-L86)
- **Explanation**: Gemini functions are declared as tools. The LLM decides when to execute specific endpoints (`getOrderStatus`, `createSupportTicket`, etc.) depending on queries.
- **Demonstration**: In the chat panel, ask the agent to check on an order status or fetch your tickets. The logs will display function triggers.

### Multi-step Agent
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L173-L373)
- **Explanation**: Loops tool calling suggestions. The model runs a tool, inspects the response, and chooses to run another tool or provide a final answer (e.g. checking a delayed order status, then auto-creating a ticket).
- **Demonstration**: Ask: *"Check order #ORD-100203. If it is delayed, create a support ticket."*

### LLM Evaluation Sets
- **Status**: Completed
- **File Path**: [evaluate.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/eval/evaluate.ts)
- **Explanation**: A suite of 12 complex test cases simulating RAG lookup, order checks, ticket additions, prompt injection resistance, and hallucination containment. Saves outputs to MongoDB.
- **Demonstration**: Run `npm run evaluate` in the backend directory.

### Prompt Engineering
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L225-L241)
- **Explanation**: Configures explicit system prompt hierarchies specifying JSON output shapes, tool structures, security boundaries, and instructions to avoid hallucinations.

### Prompt Injection Defenses
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L225-L241)
- **Explanation**: Prompt directives declare that retrieved documents must be treated as information only, never as execution scripts. Also, user profiles and queries restrict tool calls to the active user's ID via backend code, preventing parametric injection overrides.

### RAG - Embeddings & Vector Retrieval
- **Status**: Completed
- **File Path**: [rag.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/rag.service.ts)
- **Explanation**: Extracts text, segments it into character chunks with overlap, computes embeddings (`text-embedding-004`), stores them in MongoDB, and executes Cosine Similarity searches.

### Streaming Responses
- **Status**: Completed
- **File Path**: [ai.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/ai.ts#L36-L79)
- **Explanation**: Employs Server-Sent Events (SSE) to flush token buffers to the frontend.

### Structured Outputs
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L309-L335)
- **Explanation**: Enforces strict JSON response objects (intent, answer, sources, confidence, actionTaken).

### Token & Cost Monitoring
- **Status**: Completed
- **File Path**: [agent.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/agent.service.ts#L337-L364) & [admin.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/admin.ts#L10-L65)
- **Explanation**: Computes actual/estimated costs based on token sizes and logs runs inside MongoDB. Administrators can review summaries via MongoDB aggregates.

---

## 2. Security & Backend Operations

### JWT Issuance & Verification
- **Status**: Completed
- **File Paths**: [auth.ts (Routes)](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/auth.ts) & [auth.ts (Middleware)](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/middleware/auth.ts)
- **Explanation**: Issues signed 24h JWT keys upon email verification; validates auth header bearership for resource security.

### Google OAuth Integration
- **Status**: Completed
- **File Path**: [auth.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/auth.ts#L112-L177)
- **Explanation**: Features Google OAuth simulation registration endpoint, upgrading credentials locally when client keys are missing.

### Password Hashing
- **Status**: Completed
- **File Path**: [auth.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/auth.ts#L33)
- **Explanation**: Encrypts password payloads with bcryptjs before saving.

### Rate Limiting
- **Status**: Completed
- **File Path**: [rateLimit.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/middleware/rateLimit.ts)
- **Explanation**: Creates specific Redis-backed limits for auth (10 attempts / 15 mins), uploads (5 / 10 mins), and AI (20 / 10 mins).

### Role-Based Authorization
- **Status**: Completed
- **File Path**: [auth.ts (Middleware)](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/middleware/auth.ts#L70-L94)
- **Explanation**: REST routes check user scopes before continuing (`CUSTOMER` vs `ADMIN`).

### Caching with Redis
- **Status**: Completed
- **File Path**: [orders.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/orders.ts#L18-L96)
- **Explanation**: Caches customer order searches inside Redis with a 5-minute TTL. Invalidates cache when new orders are created.

### WebSocket / Real-time Communication
- **Status**: Completed
- **File Paths**: [server.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/server.ts) & [ai.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/ai.ts#L39-L44)
- **Explanation**: Broadcasts agent progress updates in real-time (e.g. `calling_tool`, `generating_response`) to Socket.IO channels.

### Payment Gateway & Subscriptions
- **Status**: Completed
- **File Paths**: [payment.service.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/services/payment.service.ts) & [payments.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/payments.ts)
- **Explanation**: Implements checkout links and webhook triggers (with local simulation toggle if Stripe parameters are empty) to unlock Pro tiers.

### Scheduled Jobs / Cron
- **Status**: Completed
- **File Path**: [cron.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/jobs/cron.ts)
- **Explanation**: Runs cron loops that auto-escalate tickets older than 24h and aggregate AI statistics daily.

---

## 3. Databases

### Schema Modeling (SQL + Mongoose)
- **Status**: Completed
- **File Paths**: [schema.prisma](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/prisma/schema.prisma) & [MongoModels.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/models/MongoModels.ts)
- **Explanation**: PostgreSQL stores normalized business layers (User, Order, Ticket); MongoDB stores high-throughput, unstructured logs (runs, chunks, logs).

### SQL Joins / Filtering / Indexes
- **Status**: Completed
- **File Path**: [schema.prisma](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/prisma/schema.prisma)
- **Explanation**: Normalizes data with Foreign Keys (FKs), adds indexing for performance on frequent lookup paths (`email`, `userId`), and applies relational queries via Prisma.

### MongoDB Aggregation Pipelines
- **Status**: Completed
- **File Path**: [admin.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/admin.ts#L10-L65)
- **Explanation**: Employs advanced MongoDB pipelines to summarize runs (counting requests, tokens, costs, average latencies) and group tool call volumes.

### Database Indexing (MongoDB)
- **Status**: Completed
- **File Path**: [MongoModels.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/models/MongoModels.ts)
- **Explanation**: Indexes lookups on high-frequency reference columns (`userId`, `createdAt`, `runId`).

---

## 4. Frontend & Testing

### React State Management & Hooks
- **Status**: Will trace to frontend once scaffolded.
- **Explanation**: Next.js client pages use `useState` for tracking dynamic chats, `useEffect` for socket connections, and custom fetch integrations.

### API Integrations & WebSockets
- **Status**: Will trace to frontend once scaffolded.
- **Explanation**: The client connects to Socket.io servers and parses SSE streams to print AI answers progressively.

### Automated Testing (Jest/Supertest)
- **Status**: Completed
- **File Path**: [backend.test.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/tests/backend.test.ts)
- **Explanation**: Implements password checks, token generation tests, and mocks HTTP calls for registration, login, and user profile pathways.
- **Demonstration**: Run `npm run test` in the backend.

### Containerization (Docker)
- **Status**: Completed
- **File Path**: [docker-compose.yml](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/docker-compose.yml) & [Dockerfile](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/Dockerfile)
- **Explanation**: Encapsulates PostgreSQL, MongoDB, Redis, API servers, and frontend clients.
- **Demonstration**: Run `docker compose up --build`.
