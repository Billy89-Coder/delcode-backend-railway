create extension if not exists "uuid-ossp";

create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  username text unique,
  full_name text,
  email text unique not null,
  phone text,
  password_hash text not null,
  role text not null default 'user',
  is_verified boolean not null default false,
  is_blocked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table users add column if not exists username text unique;
alter table users add column if not exists full_name text;

create table if not exists otp_codes (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  otp_code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists password_resets (
  id uuid primary key default uuid_generate_v4(),
  email text not null,
  token text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists login_devices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references users(id) on delete cascade,
  jwt_token text not null,
  device_name text,
  os_name text,
  browser_name text,
  ip_address text,

  country text,
  created_at timestamptz not null default now(),
  last_active_at timestamptz not null default now()
);

create table if not exists login_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete set null,
  action text not null default 'login',
  session_time_seconds int default 0,
  page_path text default '/',
  created_at timestamptz not null default now()
);
