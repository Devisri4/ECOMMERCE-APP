// Shared by sign-up and change-password. The backend checks the same rules on both
// (isStrongPassword in backend/controllers/userController.js).
export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'One number', test: (p) => /\d/.test(p) },
];

export const meetsPasswordRules = (password) => PASSWORD_RULES.every((rule) => rule.test(password));
