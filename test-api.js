const fs = require('fs');


(async () => {
  try {
    // 1. Fetch home page to get CSRF token and cookies
    const res = await fetch('https://aranyavihaara.karnataka.gov.in/');
    const html = await res.text();
    
    // Extract cookies
    const cookies = res.headers.get('set-cookie') || '';
    
    // Extract token
    const tokenMatch = html.match(/name="_token" value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : '';
    console.log("Token:", token);
    
    // Extract districts
    const districtMatches = [...html.matchAll(/<option value="(\d+)">(.*?)<\/option>/g)];
    const districts = districtMatches
      .map(m => ({ id: m[1], name: m[2].trim() }))
      .filter(d => d.id !== '' && d.name && !d.name.includes('ಆಯ್ಕೆ ಮಾಡಿ'));
      
    console.log("Districts found:", districts.length);
    
    if (districts.length === 0) return;
    
    // 2. Fetch treks for first district
    const dId = districts[0].id;
    console.log("Fetching treks for district:", dId);
    
    const params = new URLSearchParams();
    params.append('_token', token);
    params.append('district_id', dId);
    
    const treksRes = await fetch('https://aranyavihaara.karnataka.gov.in/get-treks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: params.toString()
    });
    
    const treks = await treksRes.json();
    console.log("Treks:", treks);
    
    if (treks.length === 0) return;
    
    // 3. Fetch blocked dates for first trek
    const tId = treks[0].id;
    console.log("Fetching blocked dates for trek:", tId);
    
    const blockParams = new URLSearchParams();
    blockParams.append('_token', token);
    blockParams.append('district_id', dId);
    blockParams.append('trek_id', tId);
    
    const blockRes = await fetch('https://aranyavihaara.karnataka.gov.in/get-blocked-dates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Cookie': cookies,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: blockParams.toString()
    });
    
    const blockData = await blockRes.json();
    console.log("Blocked dates data:", blockData);
    
  } catch(e) {
    console.error(e);
  }
})();
