const rateLimit = require("express-rate-limit");

// Limit each IP to 20 requests per minute to prevent flooding
const submissionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { error: "too_many_requests", message: "Rate limit exceeded. Please try again later." },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
});

module.exports = { submissionRateLimiter };
