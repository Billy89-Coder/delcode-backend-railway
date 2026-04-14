import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(4)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, underscore'),
  fullName: z.string().min(2).max(80),
  email: z.string().email().max(120),
  phone: z.string().min(9).max(16),
  password: z.string().min(8).max(72)
});

export const loginSchema = z.object({
  identifier: z.string().min(3).max(120).optional(),
  email: z.string().email().max(120).optional(),
  password: z.string().min(8).max(72)
}).refine((data) => Boolean(data.identifier || data.email), {
  message: 'Identifier is required',
  path: ['identifier']
});

export const otpSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be exactly 6 digits')
});

export const emailSchema = z.object({
  email: z.string().email()
});

export const resetSchema = z.object({
  token: z.string().min(30),
  newPassword: z.string().min(8).max(72)
});
