export function errorHandler(error, _req, res, _next) {
  console.error('[Delcode Error]', error);
  const status = error.statusCode || error.status || 500;
  return res.status(status).json({
    message: error.publicMessage || (status < 500 ? error.message : 'Internal server error')
  });
}
