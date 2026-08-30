export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found: ${req.originalUrl}`));
};

export const errorHandler = (err, req, res, next) => {
  // Prefer an explicit status set on the error (err.statusCode / err.status),
  // then a non-200 status already on the response, then 500.
  const explicit = Number(err.statusCode || err.status) || 0;
  const fromRes = res.statusCode && res.statusCode !== 200 ? res.statusCode : 0;
  const statusCode = explicit || fromRes || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || "Server error",
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
