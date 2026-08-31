# SupportPilot API Reference

All requests must target the `/api/v1` base route. Protected endpoints require the `Authorization: Bearer <JWT_TOKEN>` header.

---

## 1. Authentication (`/api/v1/auth`)

### Register
- **Endpoint**: `POST /register`
- **Rate Limit**: Stricter (10 attempts / 15 minutes)
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword",
    "name": "Alex Doe"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "eyJhbGciOi...",
      "user": {
        "id": "uuid-1234",
        "email": "user@example.com",
        "name": "Alex Doe",
        "role": "CUSTOMER"
      }
    }
  }
  ```

### Login
- **Endpoint**: `POST /login`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "securepassword"
  }
  ```
- **Response (200 OK)**: JWT token and user profile details.

---

## 2. Customer Resources

### Profile (`/api/v1/users/profile`)
- **Endpoint**: `GET /profile`
- **Response (200 OK)**: Returns the user detail, including subscription tier status.

### Orders (`/api/v1/orders`)
- **Endpoint**: `GET /` (lists user's orders) or `GET /:id` (specific order details). Cached in Redis.
- **Create Order**: `POST /` (for simulation setups).

### Tickets (`/api/v1/tickets`)
- **List Tickets**: `GET /`
- **Create Ticket**: `POST /`
  - **Body**: `{"title": "charger broken", "description": "wont charge", "category": "TECHNICAL"}`
- **Message Thread Details**: `GET /:id`
- **Reply message**: `POST /:id/messages`
  - **Body**: `{"message": "Still having this issue"}`

---

## 3. AI Agent & Streaming (`/api/v1/ai`)

### RAG Chat (Server-Sent Events)
- **Endpoint**: `POST /chat`
- **Rate Limit**: AI (20 requests / 10 minutes)
- **Request Body**:
  ```json
  {
    "conversationId": "mongoose-conv-id-optional",
    "message": "Check my order #ORD-100201 and search our returns guide"
  }
  ```
- **Response (200 OK, event-stream)**:
  - **Text Chunks**:
    `data: {"type": "content", "chunk": "I found order..."}`
  - **Final Payload**:
    `data: {"type": "done", "metadata": {"conversationId": "...", "intent": "order_lookup", "sources": ["returns-policy.pdf"], "confidence": 0.95, "actionTaken": false, "tokens": {...}, "cost": 0.00015}}`

---

## 4. Administrative Services (`/api/v1/admin`)

### Usage Analytics
- **Endpoint**: `GET /ai-usage`
- **Response (200 OK)**: Summarizes total queries, input/output tokens, costs, average latencies, and tool distributions.

### Ingest Documents
- **Endpoint**: `POST /api/v1/documents/upload`
- **Request (Multipart/form-data)**: `file` (PDF/TXT)
- **Response (201 Created)**: Vector parsing chunks details.
