import { UAParser } from 'ua-parser-js';

export function parseUserAgent(uaString = '') {
  const parser = new UAParser(uaString);
  const result = parser.getResult();

  const browser = result.browser.name || 'Unknown Browser';
  const os      = result.os.name      || 'Unknown OS';
  const device  = result.device.type === 'mobile' ? 'Mobile'
                : result.device.type === 'tablet' ? 'Tablet'
                : 'Desktop';

  return { browser, os, device };
}