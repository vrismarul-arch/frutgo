// Central error handler. Any error thrown/passed to next() lands here.
function notFound(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(err);

  // Field-level validation errors -> { errors: { field: "message" } }
  if (err.errors) {
    return res.status(422).json({ errors: err.errors });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || "Internal server error" });
}

module.exports = { notFound, errorHandler };
