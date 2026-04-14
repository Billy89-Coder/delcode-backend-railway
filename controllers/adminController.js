import { supabase } from '../config/supabase.js';
import { getScanPolicy, setScanPolicy } from '../services/scanPolicyService.js';

export async function listUsers(req, res) {
  const q = (req.query.q || '').toLowerCase();
  let query = supabase.from('users').select('id,email,phone,role,is_blocked,created_at').order('created_at', { ascending: false }).limit(100);
  if (q) {
    query = query.or(`email.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data } = await query;
  return res.json({ users: data || [] });
}

export async function updateUserStatus(req, res) {
  await supabase.from('users').update({ is_blocked: !!req.body.blocked }).eq('id', req.params.userId);
  return res.json({ message: 'User status updated' });
}

export async function deleteUser(req, res) {
  await supabase.from('users').delete().eq('id', req.params.userId);
  return res.json({ message: 'User deleted' });
}

export async function analytics(req, res) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();

  const [{ count: totalUsers }, { count: usersToday }, { count: totalLogins }, { data: onlineRows }, { data: deviceRows }, { data: pageRows }, { data: loginRows }] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', start),
    supabase.from('login_logs').select('id', { count: 'exact', head: true }),
    supabase.from('login_devices').select('user_id,last_active_at').gte('last_active_at', start),
    supabase.from('login_devices').select('device_name,country,ip_address'),
    supabase.from('login_logs').select('page_path,session_time_seconds'),
    supabase.from('login_logs').select('user_id,action,page_path,session_time_seconds,created_at').order('created_at', { ascending: false }).limit(30)
  ]);

  const onlineToday = new Set((onlineRows || []).map((r) => r.user_id)).size;
  const popularDevices = aggregateCount(deviceRows || [], 'device_name', 'Unknown');
  const countries = aggregateCount(deviceRows || [], 'country', 'Unknown');
  const topIps = aggregateCount(deviceRows || [], 'ip_address', 'unknown');
  const topPages = aggregateCount(pageRows || [], 'page_path', '/');
  const avgSession =
    pageRows && pageRows.length > 0
      ? Math.round(pageRows.reduce((sum, row) => sum + (row.session_time_seconds || 0), 0) / pageRows.length)
      : 0;
  const growth = [
    { name: 'Day', users: usersToday || 0 },
    { name: 'Week', users: Math.round((usersToday || 0) * 3.4) },
    { name: 'Month', users: Math.round((usersToday || 0) * 12.8) }
  ];

  return res.json({
    totalUsers: totalUsers || 0,
    usersToday: usersToday || 0,
    onlineToday,
    totalLogins: totalLogins || 0,
    popularDevices,
    countries,
    topIps,
    avgSession,
    topPages: topPages.map((row) => ({ page: row.name, views: row.value })),
    growth,
    loginHistory: loginRows || []
  });
}

export async function listLoginDevices(req, res) {
  const { data } = await supabase
    .from('login_devices')
    .select('id,user_id,device_name,os_name,browser_name,ip_address,country,created_at,last_active_at,users(email)')
    .order('last_active_at', { ascending: false })
    .limit(100);
  return res.json({ devices: data || [] });
}

export async function adminLogoutDevice(req, res) {
  await supabase.from('login_devices').delete().eq('id', req.params.deviceId);
  return res.json({ message: 'Device logged out by admin' });
}

export async function getScanResultPolicy(req, res) {
  return res.json({ policy: getScanPolicy() });
}

export async function updateScanResultPolicy(req, res) {
  const policy = req.body?.policy;
  if (!['safe', 'hidden', 'random'].includes(policy)) {
    return res.status(400).json({ message: 'Invalid policy value' });
  }
  setScanPolicy(policy);
  return res.json({ message: 'Scan policy updated', policy });
}

function aggregateCount(rows, key, fallback) {
  const map = new Map();
  rows.forEach((item) => {
    const value = item[key] || fallback;
    map.set(value, (map.get(value) || 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
}
