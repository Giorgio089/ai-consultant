export const isSafeUrl = (urlStr) => {
  try {
    const urlObj = new URL(urlStr);
    const protocol = urlObj.protocol.toLowerCase();

    // 1. Protocol Check
    if (protocol !== 'http:' && protocol !== 'https:') {
      return { safe: false, error: 'Only HTTP and HTTPS protocols are supported.' };
    }

    const hostname = urlObj.hostname;

    // 2. Localhost Check
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.local')) {
      return { safe: false, error: 'Cannot analyze local or internal URLs.' };
    }

    // 3. Private IP Check
    // Simple regex for IPv4
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);

    if (match) {
      const parts = match.slice(1).map(Number);
      // Check 10.0.0.0/8
      if (parts[0] === 10) return { safe: false, error: 'Cannot analyze private IP addresses.' };
      // Check 172.16.0.0/12
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return { safe: false, error: 'Cannot analyze private IP addresses.' };
      // Check 192.168.0.0/16
      if (parts[0] === 192 && parts[1] === 168) return { safe: false, error: 'Cannot analyze private IP addresses.' };
      // Check 127.0.0.0/8 (already covered by localhost but good for completeness)
      if (parts[0] === 127) return { safe: false, error: 'Cannot analyze loopback addresses.' };
    }

    return { safe: true };
  } catch (e) {
    return { safe: false, error: 'Invalid URL format.' };
  }
};
