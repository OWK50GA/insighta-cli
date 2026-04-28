import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { renderPagination } from './paginator';

/**
 * Property 11: Pagination display contains all four metadata values
 * Validates: Requirements 9.5
 */
test.prop([
  fc.integer({ min: 1, max: 10000 }),
  fc.integer({ min: 1, max: 100 }),
  fc.integer({ min: 0, max: 1000000 }),
  fc.integer({ min: 1, max: 10000 }),
])('Property 11: rendered pagination string contains all four metadata values', (page, limit, total, totalPages) => {
  const result = renderPagination({ page, limit, total, totalPages });
  expect(result).toContain(String(page));
  expect(result).toContain(String(limit));
  expect(result).toContain(String(total));
  expect(result).toContain(String(totalPages));
});
