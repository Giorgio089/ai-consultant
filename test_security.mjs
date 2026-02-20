import { isSafeUrl } from './src/utils/security.js';

const testCases = [
  // Safe URLs
  { url: 'https://google.com', expected: true },
  { url: 'http://example.com', expected: true },
  { url: 'https://www.example.com/path?query=1', expected: true },

  // Unsafe URLs (Private IPs)
  { url: 'http://127.0.0.1', expected: false },
  { url: 'http://localhost', expected: false },
  { url: 'http://10.0.0.1', expected: false },
  { url: 'http://192.168.1.1', expected: false },
  { url: 'http://172.16.0.1', expected: false },
  { url: 'http://172.31.255.255', expected: false },

  // Safe Public IPs (Random examples)
  { url: 'http://8.8.8.8', expected: true }, // Google DNS
  { url: 'http://1.1.1.1', expected: true }, // Cloudflare DNS

  // Unsafe Protocols
  { url: 'ftp://example.com', expected: false },
  { url: 'file:///etc/passwd', expected: false },
  { url: 'javascript:alert(1)', expected: false },

  // Invalid URL
  { url: 'not_a_url', expected: false },
];

let failed = false;

console.log('Running security tests...');

testCases.forEach(({ url, expected }) => {
  const result = isSafeUrl(url);
  if (result.safe !== expected) {
    console.error(`❌ Test failed for URL: ${url}. Expected safe: ${expected}, Got: ${result.safe}. Error: ${result.error}`);
    failed = true;
  } else {
    console.log(`✅ Test passed for URL: ${url}`);
  }
});

if (failed) {
  console.error('Some tests failed.');
  process.exit(1);
} else {
  console.log('All tests passed!');
}
