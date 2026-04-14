import { UAParser } from 'ua-parser-js';
import { supabase } from '../config/supabase.js';

export async function trackLoginDevice({ userId, token, req }) {
  const parser = new UAParser(req.headers['user-agent']);
  const os = parser.getOS().name || 'Unknown OS';
  const browser = parser.getBrowser().name || 'Unknown Browser';
  const deviceName = parser.getDevice().model || parser.getDevice().type || 'Desktop';
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const { data: existingDevice } = await supabase
    .from('login_devices')
    .select('id')
    .eq('user_id', userId)
    .eq('os_name', os)
    .eq('browser_name', browser)
    .eq('ip_address', ip)
    .maybeSingle();

  await supabase.from('login_devices').insert({
    user_id: userId,
    jwt_token: token,
    device_name: deviceName,
    os_name: os,
    browser_name: browser,
    ip_address: ip,
    last_active_at: new Date().toISOString()
  });

  return { os, browser, deviceName, ip, isNewDevice: !existingDevice };
}
