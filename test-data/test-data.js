import { randomUUID } from 'node:crypto';
import apiTestData from './api-test-data.json' with { type: 'json' };

/** @typedef {Record<string, string> & { email: string, password: string }} ApiUser */

/**
 * Build a fresh account payload with a unique email and password for one scenario.
 *
 * @returns {ApiUser}
 */
export function createApiUser() {
  const uniqueId = randomUUID();

  return {
    ...apiTestData.accountProfile,
    email: `${apiTestData.accountEmailPrefix}-${uniqueId}@example.com`,
    password: `ApiTest-${uniqueId}`,
  };
}
