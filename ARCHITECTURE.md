# SupportPilot System Architecture

SupportPilot is designed as a multi-tier, full-stack SaaS platform incorporating transactional databases, schema-flexible document logging, memory-mapped caching, and real-time streaming AI agents.

---

## 1. High-Level Architectural Flow

```text
                     ┌─────────────────────┐
                     │      Next.js        │
                     │      Frontend       │
                     └──────────┬──────────┘
                                │
                       REST / SSE / WebSocket
                                │
                     ┌──────────▼──────────┐
                     │   Express Backend   │
                     │     API Layer       │
                     └──────────┬──────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
        PostgreSQL           MongoDB            Redis
        Business Data        AI Data           Cache
              │                 │                 │
              └─────────────────┼─────────────────┘
                                │
                         ┌──────▼──────┐
                         │ AI Service  │
                         └──────┬──────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
              Agent            RAG             LLM
                │               │
          ┌─────┼─────┐         │
          ▼     ▼     ▼         ▼
        Orders Tickets Users  Vector Search
```

1. **Client Tier**: Next.js App Router UI connecting to the Backend API.
2. **Server Tier**: Express Node.js Server exposing REST APIs, SSE Streams, and WebSockets.
3. **Database Tier**:
   - **PostgreSQL (relational)**: Holds relational business records where ACID guarantees are crucial.
   - **MongoDB (NoSQL)**: Holds high-throughput, polymorphic AI logging records.
   - **Redis (cache)**: Caches search outputs, maintains user rate limits, and buffers temporary session metrics.
4. **AI Core**: Google Gemini SDK parsing schemas, managing embeddings, and executing sequential tool steps.

---

## 2. Database Selection & Relational Schema

### Why We Split PostgreSQL and MongoDB
- **PostgreSQL** is utilized for transactional datasets like Users, Subscriptions, Payments, Orders, and Ticket statuses. These records require relations, strict foreign keys, indexing, and transactional boundaries (e.g. subscribing a customer, recording billing statements).
- **MongoDB** is schema-flexible. Logs for chat histories, token cost aggregations, prompt injection telemetry, and chunked vector embeddings change metadata parameters frequently. Storing this high-throughput data in MongoDB prevents relational DB lockups and indexes lookups efficiently.

---

## 3. Real-Time Telemetry & SSE Flow

To provide a highly interactive dashboard experience:
1. **Socket.IO Status Messages**: While the multi-step agent executes queries (fetching databases, invoking knowledge searches), it publishes progress states (`agent.started`, `agent.calling_tool`, `agent.completed`) to a Socket.io room dedicated to the active conversation: `conversation_${conversationId}`.
2. **Server-Sent Events (SSE)**: The backend API streams the text chunks of the final answer progressively using an SSE stream (`Content-Type: text/event-stream`).
3. **Citations & Final Payload**: Once text generation is complete, the final SSE event writes the full JSON schema block including intent tags, document sources, and token usages.

---

## 4. RAG Vector Search Strategy

1. **Document Processing**: When files are uploaded by Administrators, they are processed via `pdf-parse` or text readers. They are split into ~800-character segments with a 100-character overlap.
2. **Embeddings**: Gemini `text-embedding-004` generates 768-dimensional float arrays.
3. **Cosine Similarity Search**: The segments are stored in MongoDB. The search query is embedded, and a cosine-similarity sorting algorithm selects the top matching chunks in-memory. This ensures consistent performance without database-level plugin compilation failures.
