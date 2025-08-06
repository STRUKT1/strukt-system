// middleware/errorHandler.js

/**
 * Central error handling middleware.  When an error is passed to
 * `next(err)`, this function sends a JSON response with a sensible
 * status code and message.  If an error has a defined `status` property,
 * that will be used; otherwise HTTP 500 is assumed.
 *
 * Express automatically stops processing the request once an error is
 * handled here.  See server/index.js for registration.
 */
module.exports = function errorHandler(err, req, res, next) {
  // Log the error.  In production, consider sending this to a logger
  // like Winston or Sentry instead of console.error.
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({ success: false, message });
};