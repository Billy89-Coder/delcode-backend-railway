import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { validate } from '../middleware/validationMiddleware.js';
import { emailSchema, loginSchema, otpSchema, registerSchema, resetSchema } from '../utils/schemas.js';
import {
  forgotPassword,
  googleCallback,
  googleLogin,
  googleStart,
  login,
  register,
  resendOtp,
  resetPassword,
  verifyOtp
} from '../controllers/authController.js';

const router = Router();

router.use(authLimiter);
router.post('/register', validate(registerSchema), asyncHandler(register));
router.post('/verify-otp', validate(otpSchema), asyncHandler(verifyOtp));
router.post('/resend-otp', validate(emailSchema), asyncHandler(resendOtp));
router.post('/login', validate(loginSchema), asyncHandler(login));
router.post('/google', asyncHandler(googleLogin));
router.get('/google/start', asyncHandler(googleStart));
router.get('/google/callback', asyncHandler(googleCallback));
router.post('/forgot-password', validate(emailSchema), asyncHandler(forgotPassword));
router.post('/reset-password', validate(resetSchema), asyncHandler(resetPassword));

export default router;
