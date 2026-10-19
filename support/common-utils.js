const DEFAULT_CREDENTIAL_ERROR =
  'Set VALID_USERNAME and VALID_PASSWORD in .env before running this scenario.';

/**
 * Read the configured login credentials without exposing them in errors or logs.
 *
 * @param {string} [errorMessage]
 * @returns {{ email: string, password: string, username: string }}
 */
export function getConfiguredCredentials(errorMessage = DEFAULT_CREDENTIAL_ERROR) {
  const email = process.env.VALID_EMAIL?.trim();
  const password = process.env.VALID_PASSWORD;
  const username = process.env.VALID_USERNAME;

  if (!email || !password) {
    throw new Error(errorMessage);
  }

  return { email, password, username };
}
