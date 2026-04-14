import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing auth token' });
  }
  try {
    const token = header.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { data: user } = await supabase.from('users').select('*').eq('id', payload.sub).single();
    if (!user || user.is_blocked) {
      return res.status(401).json({ message: 'Unauthorized user' });
    }
    req.user = user;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin only' });
  }
  next();
}
