const https = require('https');

(async () => {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };

    // 1. Fetch home page to get CSRF token and cookies
    console.log("Fetching home page...");
    const res = await fetch('https://aranyavihaara.karnataka.gov.in/', { headers });
    const html = await res.text();
    
    // Extract cookies
    const cookieHeader = res.headers.get('set-cookie');
    let cookies = '';
    if (cookieHeader) {
        // Simple extraction of session cookies
        cookies = cookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
    }
    
    // Extract token
    const tokenMatch = html.match(/name="_token" value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : '';
    console.log("Token:", token);
    
    // Extract districts
    const districtMatches = [...html.matchAll(/<option value="(\d+)">(.*?)<\/option>/g)];
    const districts = districtMatches
      .map(m => ({ value: m[1], text: m[2].trim() }))
      .filter(d => d.value !== '' && d.text && !d.text.includes('ಆಯ್ಕೆ ಮಾಡಿ'));
      
    console.log("Districts found:", districts.length);
    if (districts.length === 0) return;
    
    const dId = districts[0].value;
    console.log("Fetching treks for district:", dId);
    
    const params = new URLSearchParams();
    params.append('_token', token);
    params.append('district_id', dId);
    
    const treksRes = await fetch('https://aranyavihaara.karnataka.gov.in/get-treks', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://aranyavihaara.karnataka.gov.in',
        'Referer': 'https://aranyavihaara.karnataka.gov.in/'
      },
      body: params.toString()
    });
    
    const treksText = await treksRes.text();
    let treks = [];
    try {
        treks = JSON.parse(treksText);
        console.log("Treks:", treks.length);
    } catch(e) {
        console.log("Failed to parse treks. Response:", treksText.substring(0, 100));
        return;
    }
    
    if (treks.length === 0) return;
    
    const tId = treks[0].id;
    console.log("Fetching blocked dates for trek:", tId);
    
    const blockParams = new URLSearchParams();
    blockParams.append('_token', token);
    blockParams.append('district_id', dId);
    blockParams.append('trek_id', tId);
    
    const blockRes = await fetch('https://aranyavihaara.karnataka.gov.in/get-blocked-dates', {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://aranyavihaara.karnataka.gov.in',
        'Referer': 'https://aranyavihaara.karnataka.gov.in/'
      },
      body: blockParams.toString()
    });
    
    const blockText = await blockRes.text();
    try {
        const blockData = JSON.parse(blockText);
        console.log("Blocked dates:", blockData.blockedDates);
    } catch (e) {
        console.log("Failed to parse blocked dates. Response:", blockText.substring(0, 100));
    }
    
  } catch(e) {
    console.error(e);
  }
})();
