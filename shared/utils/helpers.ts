// shared/utils/helpers.ts

export function generateDeviceId(): string {
  if (typeof window !== 'undefined') {
    // Web
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }
  // Mobile - 會在各平台實現中覆蓋
  return `device-${Date.now()}`;
}

export function getDeviceName(): string {
  if (typeof window !== 'undefined') {
    return `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`;
  }
  return 'Unknown Device';
}

export function generateDeepLink(inviteCode: string, scheme: string = 'myapp'): string {
  return `${scheme}://join?code=${inviteCode}`;
}

export function parseDeepLink(url: string): { code?: string } {
  try {
    const urlObj = new URL(url);
    return {
      code: urlObj.searchParams.get('code') || undefined,
    };
  } catch {
    return {};
  }
}