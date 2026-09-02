function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Express JSON parser errors
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      error: "invalid_json",
      message: "Request body contains invalid JSON",
    });
  }

  // Preserve known HTTP status codes such as 413 Payload Too Large
  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: err.type || "invalid_request",
      message: err.message || "Invalid request",
    });
  }

  console.error("Unhandled application error:", err);

  res.status(500).json({
    error: "internal_server_error",
    message: "An unexpected error occurred",
  });
}

module.exports = errorHandler;