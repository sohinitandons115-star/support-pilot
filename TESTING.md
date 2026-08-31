# SupportPilot Testing & Evaluation

SupportPilot implements a multi-tier verification strategy consisting of Unit Tests, Integration/API Tests, and LLM Agent Evaluation Suites.

---

## 1. Automated Testing Suite (Jest & Supertest)

Backend testing is run via **Jest** and **Supertest** to verify operational correctness. To run tests, execute the following command inside `/backend`:

```bash
npm run test
```

### Scope of Tests
1. **Unit Tests**:
   - **Password Hashing**: Verifies that passwords are encrypted with `bcryptjs` and comparison keys return expected boolean resolutions.
   - **JWT Issuance**: Validates token generation, checking if roles (`CUSTOMER`, `ADMIN`) are correctly encoded in payloads.
   - **Cost Calculations**: Computes accuracy multipliers matching Gemini 1.5 token cost limits.
2. **Integration/API Tests**:
   - **Registration & Login (`/api/v1/auth`)**: Tests register and login controllers, verifying validation triggers (e.g. rejecting short passwords with `VALIDATION_ERROR` codes).
   - **RBAC Security (`/api/v1/users/profile`)**: Validates that routes block requests missing Bearer tokens and accept authorized users.

### Database Mocking Strategy
The database configurations (`prisma`, `redis`, and Mongoose models) are fully mocked inside `src/tests/backend.test.ts` using Jest mock interceptors. This ensures tests run quickly, reliably, and without requiring active database services or docker containers to be running.

---

## 2. LLM Agent Evaluation (`npm run evaluate`)

Evaluation testing is executed in `/backend` using a deterministic test set of 12 complex scenarios. Run the suite using:

```bash
npm run evaluate
```

### Coverage Scenarios
- **RAG policy search** (expecting `searchKnowledgeBase` trigger).
- **Relational order checks** (expecting `getOrderStatus` trigger).
- **Support ticket registration** (expecting `createSupportTicket` trigger).
- **Multi-step action sequences** (lookup order -> create ticket).
- **Hallucination checks** (rejecting questions outside documentation scopes).
- **Prompt Injection jailbreaks** (evaluating resilience to instruction overrides).
- **Missing order numbers** (testing fallback pathways).
- **Out-of-scope requests** (recipe request blocks).

### Scoring Metrics
The evaluation script compiles:
1. **Tool Selection Accuracy**: Percentage of correct tool calls.
2. **Schema Validity**: Verifies JSON parser completion rates.
3. **Correctness Grade**: Total passed validations.
The summary grades are logged directly to MongoDB under the `EvaluationResult` model.
