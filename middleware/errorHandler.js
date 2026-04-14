export function errorHandler(error, _req, res, _next) {
  console.error('[Delcode Error]', error);
  return res.status(error.statusCode || 500).json({
    message: error.publicMessage || 'Internal server error'
  });
}
