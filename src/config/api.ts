export const ARANYA_API = {
  BASE_URL: 'https://aranyavihaara.karnataka.gov.in',
  ENDPOINTS: {
    HOME: '/',
    GET_TREKS: '/get-treks',
    GET_BLOCKED_DATES: '/get-blocked-dates'
  },
  DEFAULT_HEADERS: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Origin': 'https://aranyavihaara.karnataka.gov.in',
    'Referer': 'https://aranyavihaara.karnataka.gov.in/',
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
  }
};
