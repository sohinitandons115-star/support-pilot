# JavaScript Concepts in SupportPilot

This document explains the core JavaScript and TypeScript concepts used in SupportPilot with reference to actual implementations in the codebase.

---

## 1. Closures

A **closure** is the combination of a function bundled together with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer function’s scope even after the outer function has returned.

### Implementation in SupportPilot
We use closures to build a memory-efficient config memoization caching function in [helpers.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/utils/helpers.ts):

```typescript
export function memoize<T, Args extends any[]>(
  fn: (...args: Args) => Promise<T>,
  ttlMs = 60000
): (...args: Args) => Promise<T> {
  // Encapsulated state: only accessible to the returned inner function
  const cache = new Map<string, { value: T; expiresAt: number }>();

  return async (...args: Args): Promise<T> => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const result = await fn(...args);
    cache.set(key, { value: result, expiresAt: now + ttlMs });
    return result;
  };
}
```

### Explanation
- The `cache` variable is declared in the outer `memoize` function scope.
- The returned anonymous async function is the inner function. It references `cache`.
- When `memoize` completes and returns, its execution stack is popped, but `cache` is kept in memory because the returned inner function maintains a live reference to it. This encapsulates state without exposing it globally.

---

## 2. The Event Loop

JavaScript is single-threaded and utilizes an **Event Loop** to handle non-blocking asynchronous behaviors. Asynchronous tasks (like databases, network I/O, and timers) are delegated to the runtime environment (Node.js/browser APIs). Once finished, their callbacks are placed in queues:
1. **Microtask Queue**: Promises (`.then`, `async/await` resolves) and `process.nextTick`.
2. **Macrotask Queue**: Timers (`setTimeout`, `setInterval`), network socket responses, and disk I/O.

The Event Loop constantly checks the execution stack. When the stack is empty, it flushes the Microtask Queue completely before picking up the next item in the Macrotask Queue.

### Implementation in SupportPilot
In [ai.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/routes/ai.ts), we stream tokens via SSE using `setInterval`:

```typescript
const interval = setInterval(() => {
  if (index < answer.length) {
    const chunk = answer.substring(index, index + chunkSize);
    res.write(`data: ${JSON.stringify({ type: 'content', chunk })}\n\n`);
    index += chunkSize;
  } else {
    clearInterval(interval);
    res.end();
  }
}, 50);
```

### Explanation
- Mounting `setInterval` sets up a macrotask timer in Node's C++ background pool.
- The thread continues executing remaining synchronous code, exiting the route handler and clearing the execution stack.
- Every 50ms, Node registers the timer expiration and pushes the callback onto the macrotask queue.
- Once the stack is clear, the event loop picks up the timer callback and writes data to the HTTP stream, enabling real-time streaming without blocking main-thread responsiveness.

---

## 3. Promises vs. Callbacks

- **Callbacks**: In early JS, async operations took a callback function argument to execute upon completion. This led to "callback hell" when nesting multiple dependencies.
- **Promises**: Objects representing the eventual completion (or failure) of an async operation. They allow chaining (`.then()`, `.catch()`) and simplify asynchronous flows via `async/await` syntax.

### Implementation in SupportPilot
We use promise-based database clients (`PrismaClient`, `Mongoose`) throughout the backend, for example, fetching customer profiles:

```typescript
// Promise-based approach
try {
  const profile = await prisma.user.findUnique({
    where: { id: req.user.id }
  });
  res.status(200).json({ success: true, data: profile });
} catch (error) {
  res.status(500).json({ success: false });
}
```

By contrast, Socket.IO connections and standard Multer configurations rely on **Callbacks** because they represent event-driven message architectures that fire repeatedly rather than resolving a single outcome:

```typescript
// Callback-based Socket listener
io.on('connection', (socket) => {
  socket.on('join_conversation', ({ conversationId }) => {
    socket.join(`conversation_${conversationId}`);
  });
});
```

---

## 4. Hoisting

**Hoisting** is the JavaScript engine's behavior of allocating memory declarations before code execution.
- **Functions**: Function declarations are hoisted completely, meaning they can be called anywhere in their enclosing scope, even *before* their written definition.
- **Variables**: Variables declared with `var` are hoisted but initialized as `undefined`. Variables declared with `let` and `const` are hoisted in a "Temporal Dead Zone" (TDZ) and cannot be accessed before evaluation.

### Implementation in SupportPilot
In [helpers.ts](file:///C:/Users/sohin/.gemini/antigravity/scratch/support-pilot/backend/src/utils/helpers.ts), we declare function helpers:

```typescript
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
```

Because it is a declarative function, you can import and call `formatCurrency()` at the top of a file, and JS will resolve it at execution time without error due to function hoisting.
