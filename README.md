# Shekhai Backend  (Express + Mongoose + bKash stub)

This scaffold provides a clean, production-aware starting point for the Shekhai LMS backend.
It includes:
- Express server with modular routes
- Mongoose models: User, Course, Lesson, Enrollment, PaymentRecord
- Auth (JWT) with signup/login, role-based permit middleware
- Signed S3 upload endpoint stub (signed URL flow)
- bKash integration module (sandbox stub + instructions)
- Basic validation with express-validator
- .env.example with required environment variables

**Important**: The bKash module is included as a sandbox-ready implementation *stub*:
- It contains the actual request structure and helpers but will not work until you add bKash credentials and switch endpoints.
- You can test payments using the simulated mode.

## Quick start (development)
1. `cd shekhai-backend`
2. Copy `.env.example` to `.env` and fill values
3. `npm install`
4. `npm run dev` (uses nodemon if you install it globally or change script)

## What to fill in `.env`
- MONGODB_URI: your MongoDB connection string (Atlas recommended)
- JWT_SECRET: strong secret for JWT
- BKASH_APP_KEY, BKASH_APP_SECRET, BKASH_USERNAME, BKASH_PASSWORD: bKash sandbox/prod credentials
- S3_BUCKET, S3_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: if using S3 (optional for testing)

## Notes
- This aims to be educational and jump-start development. Treat it as a foundation, not a finished product.
- Add tests, CI, production logging, secure secret management, and a real video transcoding pipeline before production.
