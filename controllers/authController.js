import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase.js';
import { sendEmail } from '../services/mailService.js';
import { createJwt, randomOtp, randomToken } from '../services/tokenService.js';
import { trackLoginDevice } from '../services/deviceService.js';
import { cleanText } from '../utils/security.js';

export async function register(req, res) {
  const username = cleanText(req.body.username);
  const fullName = cleanText(req.body.fullName);
  const email = cleanText(req.body.email.toLowerCase());
  const phone = cleanText(req.body.phone);
  const passwordHash = await bcrypt.hash(req.body.password, 12);

  const { data: emailExisting } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (emailExisting) return res.status(409).json({ message: 'Email already exists' });
  const { data: usernameExisting } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
  if (usernameExisting) return res.status(409).json({ message: 'Username already exists' });

  await supabase.from('users').insert({
    id: uuidv4(),
    username,
    full_name: fullName,
    email,
    phone,
    password_hash: passwordHash,
    role: 'user',
    is_verified: false
  });

  try {
    await createAndSendOtp(email);
    return res.json({ message: 'Registered, OTP sent' });
  } catch (error) {
    if (process.env.ALLOW_REGISTER_WITHOUT_OTP === 'true') {
      await supabase.from('users').update({ is_verified: true }).eq('email', email);
      return res.json({ message: 'Registered successfully. OTP email is temporarily unavailable.' });
    }
    throw error;
  }
}

export async function verifyOtp(req, res) {
  const email = cleanText(req.body.email.toLowerCase());
  const otp = cleanText(req.body.otp);
  const now = new Date().toISOString();

  // Only allow the most recently generated OTP for this email.
  const { data: otpRow } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow || otpRow.otp_code !== otp || otpRow.expires_at < now) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }

  const { data: user } = await supabase.from('users').update({ is_verified: true }).eq('email', email).select('*').single();
  await supabase.from('otp_codes').delete().eq('email', email);

  const token = createJwt(user);
  await trackLoginDevice({ userId: user.id, token, req });
  return res.json({ token, user: safeUser(user) });
}

export async function resendOtp(req, res) {
  const email = cleanText(req.body.email.toLowerCase());
  const { count } = await supabase
    .from('otp_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', new Date(Date.now() - 60_000).toISOString());
  if ((count || 0) >= 1) return res.status(429).json({ message: 'Wait 60 seconds before resend OTP' });

  await createAndSendOtp(email);
  return res.json({ message: 'OTP resent' });
}

export async function login(req, res) {
  const rawIdentifier = req.body.identifier || req.body.email || '';
  const identifier = cleanText(rawIdentifier);
  const emailCandidate = identifier.toLowerCase();

  let user = null;
  ({ data: user } = await supabase.from('users').select('*').eq('email', emailCandidate).maybeSingle());
  if (!user) {
    ({ data: user } = await supabase.from('users').select('*').eq('username', identifier).maybeSingle());
  }
  if (!user) {
    ({ data: user } = await supabase.from('users').select('*').eq('phone', identifier).maybeSingle());
  }

  if (!user || user.is_blocked) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(req.body.password, user.password_hash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = createJwt(user);
  const device = await trackLoginDevice({ userId: user.id, token, req });
  await supabase.from('login_logs').insert({ user_id: user.id, action: 'login' });
  if (device.isNewDevice && process.env.ADMIN_ALERT_EMAIL) {
    await sendEmail({
      to: process.env.ADMIN_ALERT_EMAIL,
      subject: 'Delcode cảnh báo thiết bị đăng nhập mới',
      html: `<p>User: <b>${user.email}</b></p><p>Thiết bị: ${device.deviceName}</p><p>OS/Browser: ${device.os} / ${device.browser}</p><p>IP: ${device.ip}</p>`
    });
  }

  return res.json({ token, user: safeUser(user) });
}

export async function googleLogin(req, res) {
  const pseudo = cleanText(req.body.googleToken || '');
  if (!pseudo) return res.status(400).json({ message: 'Missing Google token' });

  const email = `google_${pseudo.slice(0, 12)}@delcode.oauth`;
  let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (!user) {
    const created = await supabase
      .from('users')
      .insert({ id: uuidv4(), email, password_hash: await bcrypt.hash(uuidv4(), 10), role: 'user', is_verified: true })
      .select('*')
      .single();
    user = created.data;
  }

  const token = createJwt(user);
  await trackLoginDevice({ userId: user.id, token, req });
  return res.json({ token, user: safeUser(user) });
}

export async function googleStart(req, res) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const backendBase = process.env.BACKEND_BASE_URL;
  if (!clientId || !backendBase) {
    return res.status(500).json({ message: 'Google OAuth is not configured' });
  }

  const redirectUri = `${backendBase.replace(/\/$/, '')}/api/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account'
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallback(req, res) {
  const code = cleanText(req.query.code || '');
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const backendBase = process.env.BACKEND_BASE_URL;
  const frontendBase = process.env.FRONTEND_BASE_URL || 'http://localhost:5173';
  if (!code || !clientId || !clientSecret || !backendBase) {
    return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?google_error=config`);
  }

  const redirectUri = `${backendBase.replace(/\/$/, '')}/api/auth/google/callback`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!tokenRes.ok) {
    return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?google_error=token`);
  }
  const tokenData = await tokenRes.json();

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  if (!profileRes.ok) {
    return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?google_error=profile`);
  }
  const profile = await profileRes.json();
  const email = cleanText((profile.email || '').toLowerCase());
  if (!email) {
    return res.redirect(`${frontendBase.replace(/\/$/, '')}/login?google_error=email`);
  }

  let { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (!user) {
    const username = await createUniqueUsername(email.split('@')[0] || 'google_user');
    const created = await supabase
      .from('users')
      .insert({
        id: uuidv4(),
        username,
        full_name: cleanText(profile.name || username),
        email,
        password_hash: await bcrypt.hash(uuidv4(), 10),
        role: 'user',
        is_verified: true
      })
      .select('*')
      .single();
    user = created.data;
  }

  const token = createJwt(user);
  return res.redirect(
    `${frontendBase.replace(/\/$/, '')}/login?token=${encodeURIComponent(token)}&role=${encodeURIComponent(user.role)}`
  );
}

export async function forgotPassword(req, res) {
  const email = cleanText(req.body.email.toLowerCase());
  const { data: user } = await supabase.from('users').select('id,email').eq('email', email).maybeSingle();
  if (!user) return res.json({ message: 'If account exists, reset email sent' });

  const token = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 60_000).toISOString();
  await supabase.from('password_resets').insert({ email, token, expires_at: expiresAt });

  const resetUrl = `${process.env.FRONTEND_BASE_URL || 'http://localhost:5173'}/forgot-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Delcode password reset',
    html: `<p>Reset password link:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
  return res.json({ message: 'Reset link sent' });
}

export async function resetPassword(req, res) {
  const now = new Date().toISOString();
  const { data: row } = await supabase
    .from('password_resets')
    .select('*')
    .eq('token', req.body.token)
    .gte('expires_at', now)
    .maybeSingle();

  if (!row) return res.status(400).json({ message: 'Invalid or expired reset token' });

  const hashed = await bcrypt.hash(req.body.newPassword, 12);
  await supabase.from('users').update({ password_hash: hashed }).eq('email', row.email);
  await supabase.from('password_resets').delete().eq('id', row.id);
  return res.json({ message: 'Password reset successful' });
}

async function createAndSendOtp(email) {
  const otp = randomOtp();
  const expiresAt = new Date(Date.now() + 5 * 60_000).toISOString();
  await supabase.from('otp_codes').delete().eq('email', email);
  await supabase.from('otp_codes').insert({ email, otp_code: otp, expires_at: expiresAt });
  await sendEmail({
    to: email,
    subject: 'Delcode OTP verification',
    html: `<p>Your OTP is <b>${otp}</b>. Expires in 5 minutes.</p>`
  });
}

function safeUser(user) {
  return {
    id: user.id,
    username: user.username,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    is_blocked: user.is_blocked,
    created_at: user.created_at
  };
}

async function createUniqueUsername(base) {
  const normalizedBase = cleanText(base).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 18) || 'user';
  let candidate = normalizedBase;
  let index = 0;
  while (index < 10) {
    const { data } = await supabase.from('users').select('id').eq('username', candidate).maybeSingle();
    if (!data) return candidate;
    index += 1;
    candidate = `${normalizedBase}_${Math.floor(Math.random() * 900 + 100)}`;
  }
  return `${normalizedBase}_${Date.now().toString().slice(-4)}`;
}
