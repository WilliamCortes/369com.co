/**
 * Test Harness for 369com.co E2E Tests
 * 
 * Provides transparent compatibility with both:
 * 1. Vitest test runner (via globals or package)
 * 2. Standalone Node.js execution (zero external dependencies)
 */

import * as runner from './runner.ts';

const g: any = globalThis;

export const describe = g.describe ?? runner.describe;
export const it = g.it ?? runner.it;
export const test = g.test ?? runner.it;
export const expect = g.expect ?? runner.expect;
export const beforeEach = g.beforeEach ?? runner.beforeEach;
export const afterEach = g.afterEach ?? (() => {});

export { runner };
