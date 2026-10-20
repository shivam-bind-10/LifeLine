const RESEND_API_URL = 'https://api.resend.com/emails';

export function isPasswordResetEmailConfigured() {
  return Boolean(
    process.env.RESEND_API_KEY &&
    process.env.PASSWORD_RESET_FROM &&
    process.env.CLIENT_URL,
  );
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM;
  const clientUrl = process.env.CLIENT_URL;
  if (!apiKey || !from || !clientUrl) {
    throw new Error('Password reset email delivery is not configured.');
  }

  const baseUrl = new URL(clientUrl);
  if (
    (baseUrl.protocol !== 'https:' && baseUrl.protocol !== 'http:') ||
    (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:')
  ) {
    throw new Error('CLIENT_URL must use HTTPS in production.');
  }
  baseUrl.pathname = '/auth/reset';
  baseUrl.search = '';
  baseUrl.hash = '';
  baseUrl.searchParams.set('token', token);
  const resetUrl = baseUrl.toString();

  const response = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Reset your LifeLine password',
      text: `Use this link to reset your LifeLine password. It expires in 30 minutes: ${resetUrl}\n\nIf you did not request a password reset, you can ignore this email.`,
      html: `<p>Use this link to reset your LifeLine password. It expires in 30 minutes:</p><p><a href="${escapeHtml(resetUrl)}">Reset password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) {
    throw new Error(
      `Password reset email delivery failed (HTTP ${response.status}).`,
    );
  }
}
