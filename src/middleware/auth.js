const jwt = require("jsonwebtoken");
const env = require("../config/env");

function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Bearer token required",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Bearer token required",
    });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);

    if (!payload.tenant_id) {
      return res.status(401).json({
        error: "unauthorized",
        message: "Invalid authentication token",
      });
    }

    req.user = {
      tenant_id: payload.tenant_id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: "unauthorized",
      message: "Invalid or expired token",
    });
  }
}

module.exports = { requireAuth };
