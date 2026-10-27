// Logs the real error on the server and returns a generic message, so internal details
// (stack traces, database errors, third-party messages) never reach the browser.
export const sendServerError = (res, err, message = "Something went wrong. Please try again.") => {
  console.error(err);
  return res.json({ success: false, message });
};
