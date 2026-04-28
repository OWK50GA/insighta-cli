import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import { describe, expect } from 'vitest';
import {
  formatProfile,
  formatProfileList,
  formatCreateSuccess,
  formatDeleteConfirmation,
  type Profile,
} from './formatter';

const profileArb = fc.record<Profile>({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  gender: fc.constantFrom('male' as const, 'female' as const),
  gender_probability: fc.float({ min: 0, max: 1, noNaN: true }),
  age: fc.integer({ min: 0, max: 120 }),
  age_group: fc.constantFrom('adult' as const, 'child' as const, 'teenager' as const, 'senior' as const),
  country_id: fc.string({ minLength: 2, maxLength: 3 }),
  country_name: fc.string({ minLength: 1, maxLength: 50 }),
  country_probability: fc.float({ min: 0, max: 1, noNaN: true }),
  created_at: fc.date().map(d => d.toISOString()),
});

const sampleProfile: Profile = {
  id: 'abc-123',
  name: 'Alice',
  gender: 'female',
  gender_probability: 0.97,
  age: 30,
  age_group: 'adult',
  country_id: 'US',
  country_name: 'United States',
  country_probability: 0.85,
  created_at: '2024-01-01T00:00:00.000Z',
};

// ── formatProfile ────────────────────────────────────────────────────────────

describe('formatProfile', () => {
  test.prop([profileArb])('contains id, name, gender, country', (profile) => {
    const result = formatProfile(profile);
    expect(result).toContain(profile.id);
    expect(result).toContain(profile.name);
    expect(result).toContain(profile.gender);
    expect(result).toContain(profile.country_name);
  });

  test('renders all fields for a known profile', () => {
    const result = formatProfile(sampleProfile);
    expect(result).toContain('abc-123');
    expect(result).toContain('Alice');
    expect(result).toContain('female');
    expect(result).toContain('United States');
    expect(result).toContain('2024-01-01T00:00:00.000Z');
  });
});

// ── formatProfileList ────────────────────────────────────────────────────────

describe('formatProfileList', () => {
  test('returns "No profiles found." for empty list', () => {
    expect(formatProfileList([])).toBe('No profiles found.');
  });

  test.prop([fc.array(profileArb, { minLength: 1, maxLength: 10 })])(
    'contains each profile id and name',
    (profiles) => {
      const result = formatProfileList(profiles);
      for (const p of profiles) {
        expect(result).toContain(p.id);
        expect(result).toContain(p.name);
      }
    },
  );

  test('includes total count when provided', () => {
    const result = formatProfileList([sampleProfile], 42);
    expect(result).toContain('42');
  });

  test('omits total line when total is not provided', () => {
    const result = formatProfileList([sampleProfile]);
    expect(result).not.toContain('Total results');
  });
});

// ── formatCreateSuccess ──────────────────────────────────────────────────────

/**
 * Property 14: Create success output contains profile ID and name
 * Validates: Requirements 11.2
 */
test.prop([profileArb])(
  'Property 14: formatCreateSuccess contains profile id and name',
  (profile) => {
    const result = formatCreateSuccess(profile);
    expect(result).toContain(profile.id);
    expect(result).toContain(profile.name);
  },
);

// ── formatDeleteConfirmation ─────────────────────────────────────────────────

/**
 * Property 16: Delete confirmation contains the submitted profile ID
 * Validates: Requirements 12.2
 */
test.prop([fc.uuid()])(
  'Property 16: formatDeleteConfirmation contains the profile id',
  (id) => {
    const result = formatDeleteConfirmation(id);
    expect(result).toContain(id);
  },
);
