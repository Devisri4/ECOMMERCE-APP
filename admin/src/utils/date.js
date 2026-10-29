// One date format across the admin (orders, dashboard, charts): "29 Oct 2026"
export const formatDate = (ms) =>
  new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
