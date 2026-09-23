const MIN_LENGTH = 8;

/** Requires at least 8 characters with a mix of letters, numbers and symbols. */
export function isStrongPassword(password: string): boolean {
  if (password.length < MIN_LENGTH) return false;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  return hasLetter && hasNumber && hasSymbol;
}

export const PASSWORD_REQUIREMENTS_MESSAGE =
  "Password must be at least 8 characters and include letters, numbers and a symbol.";
