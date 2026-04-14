import { supabase } from '../config/supabase.js';
import { resolveScanResult } from '../services/scanPolicyService.js';

export async function getMe(req, res) {
  return res.json({ user: req.user });
}

export async function getDevices(req, res) {
  const { data: devices } = await supabase
    .from('login_devices')
    .select('*')
    .eq('user_id', req.user.id)
    .order('last_active_at', { ascending: false });
  return res.json({ devices: devices || [] });
}

export async function logoutDevice(req, res) {
  await supabase.from('login_devices').delete().eq('id', req.params.deviceId).eq('user_id', req.user.id);
  return res.json({ message: 'Device removed' });
}

export async function getScanOutcome(req, res) {
  return res.json({ result: resolveScanResult() });
}
