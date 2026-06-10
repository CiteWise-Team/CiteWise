function errorHandler(err, req, res, next) {
  console.error(err); // log for debugging
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ error: message, details: err.details || undefined });
}

export default errorHandler;
