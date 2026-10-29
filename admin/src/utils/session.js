// Reads claims from the admin token for display only (the read-only demo banner, signing out on expiry).
// The backend verifies the token and enforces the role on every request; this is never trusted for access.
const tokenPayload = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

export const isDemoToken = (token) => tokenPayload(token)?.role === 'demo-admin'

// Expiry time in ms, or Infinity when the token has none / can't be read
export const tokenExpiresAt = (token) => {
  const exp = tokenPayload(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : Infinity
}

// Read-only demo admin for portfolio visitors (only when both variables are set for this build)
export const DEMO_ADMIN =
  import.meta.env.VITE_DEMO_ADMIN_EMAIL && import.meta.env.VITE_DEMO_ADMIN_PASSWORD
    ? { email: import.meta.env.VITE_DEMO_ADMIN_EMAIL, password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD }
    : null

// Tooltip / note for controls that the read-only demo can't use
export const DEMO_DISABLED = 'Disabled in the read-only demo'
