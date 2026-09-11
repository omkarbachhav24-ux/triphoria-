import rateLimit from 'express-rate-limit';

// Shared rate-limit configs for sensitive endpoints (B7 hardening).
// Keyed by IP (express-rate-limit default) — good enough for a single-
// instance/serverless-per-request deployment without adding a Redis
// dependency. Standardized JSON error body matches the rest of the API.
function limiterResponse(req, res) {
  res.status(429).json({
    error: 'Too many requests. Please try again later.',
    code: 'RATE_LIMITED',
  });
}

// Login: guards against credential-stuffing / brute-force guessing.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse,
});

// Registration: guards against account-creation abuse / enumeration.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse,
});

// Editor onboarding (admin-only, but still guards against runaway scripts
// or a compromised admin session from mass-provisioning accounts).
export const onboardingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse,
});

// Upload-adjacent endpoints (authorize-upload, output-version submission):
// guards against storage/DB abuse via rapid repeated calls.
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limiterResponse,
});
