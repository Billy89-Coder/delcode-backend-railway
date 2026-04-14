import nodemailer from 'nodemailer';

const smtpPort = Number(process.env.SMTP_PORT || 587);
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: process.env.SMTP_SECURE === 'true' || smtpPort === 465,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

export async function sendEmail({ to, subject, html }) {
  const hasGmailApiConfig =
    Boolean(process.env.GMAIL_CLIENT_ID) &&
    Boolean(process.env.GMAIL_CLIENT_SECRET) &&
    Boolean(process.env.GMAIL_REFRESH_TOKEN) &&
    Boolean(process.env.GMAIL_SENDER_EMAIL);

  if (hasGmailApiConfig) {
    try {
      await sendViaGmailApi({ to, subject, html });
      return;
    } catch (error) {
      console.error('[MAIL ERROR][GMAIL_API]', error);
    }
  }

  if (!process.env.SMTP_HOST) {
    console.log('[MAIL DEV MODE]', { to, subject, html });
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    error.statusCode = 503;
    error.publicMessage = 'Email service unavailable. Please try again later.';
    throw error;
  }
}

async function sendViaGmailApi({ to, subject, html }) {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  if (!tokenRes.ok) {
    throw new Error(`Gmail token request failed with status ${tokenRes.status}`);
  }

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;
  if (!accessToken) {
    throw new Error('Gmail token request did not return access token');
  }

  const from = process.env.MAIL_FROM || process.env.GMAIL_SENDER_EMAIL;
  const rawMessage = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeMimeSubject(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    '',
    html
  ].join('\r\n');

  const encodedMessage = Buffer.from(rawMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ raw: encodedMessage })
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text();
    throw new Error(`Gmail send failed with status ${sendRes.status}: ${errText}`);
  }
}

function encodeMimeSubject(subject = '') {
  const b64 = Buffer.from(subject, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}
