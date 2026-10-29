// Reads the role claim from the admin token for display only (e.g. the read-only demo banner).
// The backend verifies the token and enforces the role on every request; this is never trusted for access.
export const isDemoToken = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(payload)).role === 'demo-admin'
  } catch {
    return false
  }
}

// Read-only demo admin for portfolio visitors (only when both variables are set for this build)
export const DEMO_ADMIN =
  import.meta.env.VITE_DEMO_ADMIN_EMAIL && import.meta.env.VITE_DEMO_ADMIN_PASSWORD
    ? { email: import.meta.env.VITE_DEMO_ADMIN_EMAIL, password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD }
    : null
