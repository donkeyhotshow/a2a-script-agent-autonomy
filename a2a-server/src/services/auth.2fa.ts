/** 2FA (TOTP) helpers. */

export function generateTOTPSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let s = '';
  for (let i = 0; i < 32; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function verifyTOTP(_secret: string, _token: string): boolean {
  return false;
}

