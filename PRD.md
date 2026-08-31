# SupportPilot Product Requirements Document (PRD)

SupportPilot is a multi-role AI-powered customer support and operations platform built to optimize support ticket resolution pipelines and analyze AI usage telemetry for enterprise SaaS businesses.

---

## 1. Product Goals
- Create a unified interface where customers can fetch order logs, review support histories, upload policy records, and receive instant, source-cited AI agent responses.
- Deliver tool-calling AI agents that run sequential multi-step routines (such as checking order conditions and immediately filing support tickets).
- Provide administrative dashboards tracking model request frequencies, token volumes, latencies, and aggregated billing.
- Validate AI performance qualities using deterministic LLM evaluation datasets.

---

## 2. Core Personas & User Scopes

### A. Customer
- **Authentication**: Email/password registration or Google OAuth login.
- **Billing**: Subscribe to premium plans (Free vs Pro).
- **Orders**: View past orders and shipment status details.
- **Tickets**: Create support tickets, review message histories, and add replies.
- **AI Agent Chat**: Initiate conversations, receive answer streams, and check reasoning sub-steps.

### B. AI Support Agent
- **Capabilities**:
  - `getOrderStatus(orderNumber)`: Check customer order information.
  - `getCustomerTickets()`: Fetch previous ticket submissions.
  - `searchKnowledgeBase(query)`: Search policy files.
  - `createSupportTicket(title, description, category)`: Log new tickets in PostgreSQL.
  - `getCustomerProfile()`: Review basic customer metadata.
- **Defenses**: Refuse prompt override injections, check parametric authorization parameters, and prevent hallucinations.

### C. Administrator
- **Users**: View all registered system profiles.
- **Tickets**: Review all support tickets, change status properties, and reply to message threads.
- **Knowledge Base**: Upload files (PDF/TXT), trigger embedding parsing, and delete out-of-date documents.
- **AI Telemetry & Evaluations**: Track total tokens used, costs, latencies, and review accuracy grades of evaluation suites.

---

## 3. Requirements Checklist & Success Criteria

- **Rate Limits**: Redis rate counters must throw 429 status codes for abusive queries.
- **Streaming**: AI responses must use Server-Sent Events (SSE) to print tokens progressively.
- **Security Check**: Enforce strict backend validation (e.g. Customers can never access another customer's order parameters).
- **Scheduled Jobs**: Run escalation procedures automatically for unresolved customer logs.
