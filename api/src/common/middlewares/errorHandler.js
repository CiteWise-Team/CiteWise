// Errors we raise deliberately carry a 4xx status and a message written for the
// user. Anything else is a fault we did not anticipate, and its message tends to
// be raw driver text ("Cannot coerce the result to a single JSON object"), which
// tells a caller about our schema and helps nobody. Log those, return a generic
// line.
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;

  if (status >= 500) {
    return res.status(status).json({ error: 'Internal Server Error' });
  }

  res.status(status).json({
    error: err.message || 'Request failed',
    details: err.details || undefined,
  });
}

export default errorHandler;
