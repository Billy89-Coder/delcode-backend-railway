import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export function createJwt(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

export function randomOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function randomToken() {
  return crypto.randomBytes(32).toString('hex');
}
