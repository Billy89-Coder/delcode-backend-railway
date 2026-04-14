import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimit.js';
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
router.post('/register', validate(registerSchema), register);
router.post('/verify-otp', validate(otpSchema), verifyOtp);
router.post('/resend-otp', validate(emailSchema), resendOtp);
router.post('/login', validate(loginSchema), login);
router.post('/google', googleLogin);
router.get('/google/start', googleStart);
router.get('/google/callback', googleCallback);
router.post('/forgot-password', validate(emailSchema), forgotPassword);
router.post('/reset-password', validate(resetSchema), resetPassword);

export default router;
