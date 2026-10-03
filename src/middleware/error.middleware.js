import mongoose from 'mongoose';
export function notFound(req, res) { res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  if (err instanceof mongoose.Error.ValidationError) status = 400;
  if (err?.code === 11000) { status = 409; message = 'Duplicate value'; }
  res.status(status).json({ success: false, message, details: err.details || undefined, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
}
