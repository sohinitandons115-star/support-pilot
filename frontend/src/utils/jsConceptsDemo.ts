/**
 * SupportPilot — Frontend Core JavaScript Concepts Demonstration
 * Demonstrates: Event Loop, Promises vs Callbacks, and Hoisting
 */

// ==========================================
// 1. JAVASCRIPT CONCEPT: EVENT LOOP
// ==========================================
export interface EventLoopLog {
  step: number;
  type: 'SYNC' | 'MICROTASK (Promise)' | 'MACROTASK (Timer)';
  message: string;
}

/**
 * Demonstrates how the single-threaded JS Event Loop processes code:
 * 1. Synchronous execution stack runs first.
 * 2. Microtask Queue (Promises, queueMicrotask) is completely emptied next.
 * 3. Macrotask Queue (setTimeout, setInterval) is executed in the next loop tick.
 */
export async function demonstrateEventLoop(): Promise<EventLoopLog[]> {
  const logs: EventLoopLog[] = [];
  let stepCounter = 1;

  // Synchronous Step 1
  logs.push({ step: stepCounter++, type: 'SYNC', message: '1. Synchronous function execution starts (Call Stack)' });

  return new Promise((resolve) => {
    // Macrotask (Timer) scheduled
    setTimeout(() => {
      logs.push({ step: stepCounter++, type: 'MACROTASK (Timer)', message: '4. Macrotask callback executed after stack and microtasks clear (Event Loop tick)' });
      resolve(logs);
    }, 0);

    // Microtask (Promise) scheduled
    Promise.resolve().then(() => {
      logs.push({ step: stepCounter++, type: 'MICROTASK (Promise)', message: '3. Microtask queue emptied immediately after sync stack clears (.then resolve)' });
    });

    // Synchronous Step 2
    logs.push({ step: stepCounter++, type: 'SYNC', message: '2. Synchronous code finishes executing (Call Stack clears)' });
  });
}


// ==========================================
// 2. JAVASCRIPT CONCEPT: PROMISES VS CALLBACKS
// ==========================================

/**
 * Legacy Callback Pattern (Nested Error-First Callback)
 */
export function legacyFetchUserDataCallback(
  userId: string,
  callback: (err: Error | null, user?: { id: string; name: string }) => void
): void {
  setTimeout(() => {
    if (!userId) {
      callback(new Error('Invalid user ID'));
    } else {
      callback(null, { id: userId, name: 'Support Pilot User' });
    }
  }, 100);
}

/**
 * Modern Promise / Async-Await Refactored Pattern
 * Converts callback-based asynchronous flows into clean Promise chains.
 */
export function modernFetchUserDataPromise(userId: string): Promise<{ id: string; name: string }> {
  return new Promise((resolve, reject) => {
    legacyFetchUserDataCallback(userId, (err, user) => {
      if (err || !user) {
        reject(err || new Error('User not found'));
      } else {
        resolve(user);
      }
    });
  });
}


// ==========================================
// 3. JAVASCRIPT CONCEPT: HOISTING
// ==========================================

/**
 * Demonstrates JS Hoisting behaviors:
 * - Function Declarations are hoisted with their complete implementation.
 * - `var` declarations are hoisted as `undefined`.
 * - `let` / `const` are hoisted into the Temporal Dead Zone (TDZ) and throw ReferenceErrors if accessed early.
 */
export function demonstrateHoisting(): {
  hoistedFunctionResult: string;
  hoistedVarResult: string;
  tdzExplanation: string;
} {
  // 1. Function Hoisting: Can be called BEFORE written declaration below
  const hoistedFunctionResult = hoistedHelperFunction();

  // 2. Variable Hoisting (var): Declared below, evaluates to undefined here
  // @ts-ignore
  const hoistedVarResult = typeof legacyVar === 'undefined' ? 'undefined (hoisted variable declaration)' : legacyVar;

  var legacyVar = 'Initialized Value';

  function hoistedHelperFunction(): string {
    return 'Function declaration was hoisted to top of lexical scope successfully!';
  }

  return {
    hoistedFunctionResult,
    hoistedVarResult,
    tdzExplanation: 'const/let variables remain in Temporal Dead Zone (TDZ) until evaluation, preventing silent undefined bugs.'
  };
}
