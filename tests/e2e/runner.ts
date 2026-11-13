/**
 * E2E Test Suite Verification Runner
 * Runs all test cases across Tiers 1-4, checkout, webhook, and fulfillment
 * and verifies exit code 0.
 */

// Simple robust assertion runner compatible with Vitest signatures
let totalPassed = 0;
let totalFailed = 0;
const failures: Array<{ suite: string; test: string; error: any }> = [];
let currentSuite = '';
let beforeEachHooks: Array<() => void> = [];

export function describe(name: string, fn: () => void) {
  const previousSuite = currentSuite;
  const previousHooks = [...beforeEachHooks];
  currentSuite = previousSuite ? `${previousSuite} > ${name}` : name;
  try {
    fn();
  } finally {
    currentSuite = previousSuite;
    beforeEachHooks = previousHooks;
  }
}

export function beforeEach(fn: () => void) {
  beforeEachHooks.push(fn);
}

export function it(name: string, fn: () => void | Promise<void>) {
  for (const hook of beforeEachHooks) {
    hook();
  }
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      (res as Promise<void>).then(
        () => {
          totalPassed++;
        },
        (err) => {
          totalFailed++;
          failures.push({ suite: currentSuite, test: name, error: err });
        }
      );
    } else {
      totalPassed++;
    }
  } catch (err) {
    totalFailed++;
    failures.push({ suite: currentSuite, test: name, error: err });
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`);
      }
    },
    toStrictEqual(expected: any) {
      if (JSON.stringify(actual) !== JSON.stringify(expected) || typeof actual !== typeof expected) {
        throw new Error(`Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined, got undefined`);
      }
    },
    toBeUndefined() {
      if (actual !== undefined) {
        throw new Error(`Expected value to be undefined, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected truthy value, got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected falsy value, got ${actual}`);
      }
    },
    toBeGreaterThan(val: number) {
      if (!(actual > val)) {
        throw new Error(`Expected ${actual} to be greater than ${val}`);
      }
    },
    toBeGreaterThanOrEqual(val: number) {
      if (!(actual >= val)) {
        throw new Error(`Expected ${actual} to be >= ${val}`);
      }
    },
    toBeLessThan(val: number) {
      if (!(actual < val)) {
        throw new Error(`Expected ${actual} to be less than ${val}`);
      }
    },
    toBeLessThanOrEqual(val: number) {
      if (!(actual <= val)) {
        throw new Error(`Expected ${actual} to be <= ${val}`);
      }
    },
    toContain(expected: any) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (!actual.includes(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to contain ${JSON.stringify(expected)}`);
        }
      } else {
        throw new Error(`toContain called on non-collection: ${typeof actual}`);
      }
    },
    toHaveProperty(prop: string) {
      if (!actual || !(prop in actual)) {
        throw new Error(`Expected object to have property '${prop}'`);
      }
    },
    toMatch(regex: RegExp) {
      if (!regex.test(String(actual))) {
        throw new Error(`Expected ${actual} to match regex ${regex}`);
      }
    },
    toThrow(msgSubstring?: string) {
      if (typeof actual !== 'function') {
        throw new Error(`toThrow called on non-function`);
      }
      let threw = false;
      let caughtError: any = null;
      try {
        actual();
      } catch (err: any) {
        threw = true;
        caughtError = err;
      }
      if (!threw) {
        throw new Error(`Expected function to throw, but it succeeded`);
      }
      if (msgSubstring && !String(caughtError?.message || caughtError).includes(msgSubstring)) {
        throw new Error(`Expected error message to contain "${msgSubstring}", got "${caughtError?.message || caughtError}"`);
      }
    },
    not: {
      toBe(expected: any) {
        if (actual === expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} NOT to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(expected: any) {
        if (typeof actual === 'string' || Array.isArray(actual)) {
          if (actual.includes(expected)) {
            throw new Error(`Expected ${JSON.stringify(actual)} NOT to contain ${JSON.stringify(expected)}`);
          }
        }
      }
    },
    resolves: {
      toBe(expected: any) {
        return Promise.resolve(actual).then((val) => {
          if (val !== expected) throw new Error(`Resolved ${val} expected ${expected}`);
        });
      }
    },
    rejects: {
      toThrow(msg?: string) {
        return Promise.resolve(actual).then(
          () => {
            throw new Error(`Expected promise to reject, but it resolved`);
          },
          (err) => {
            if (msg && !String(err.message || err).includes(msg)) {
              throw new Error(`Expected rejection message "${msg}", got "${err.message || err}"`);
            }
          }
        );
      }
    }
  };
}

export function getTestSummary() {
  return {
    total: totalPassed + totalFailed,
    passed: totalPassed,
    failed: totalFailed,
    failures
  };
}
