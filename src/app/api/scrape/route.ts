import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ARANYA_API } from '@/config/api';

// --- Utility Functions ---
function getNext15Days() {
  const dates = [];
  const today = new Date();
  for (let i = 1; i <= 15; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
    const formatted = ('0' + d.getDate()).slice(-2) + '-' +
                      ('0' + (d.getMonth() + 1)).slice(-2) + '-' +
                      d.getFullYear();
    dates.push(formatted);
  }
  return dates;
}

async function getSessionAuth() {
  const res = await fetch(`${ARANYA_API.BASE_URL}${ARANYA_API.ENDPOINTS.HOME}`, {
    headers: { ...ARANYA_API.DEFAULT_HEADERS, 'Accept': 'text/html' }
  });
  
  const html = await res.text();
  const cookieHeader = res.headers.get('set-cookie');
  let cookies = '';
  if (cookieHeader) {
      cookies = cookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
  }
  
  const tokenMatch = html.match(/name="_token" value="([^"]+)"/);
  const token = tokenMatch ? tokenMatch[1] : '';
  
  const districtMatches = [...html.matchAll(/<option value="(\d+)">(.*?)<\/option>/g)];
  const districts = districtMatches
    .map(m => ({ value: m[1], text: m[2].trim() }))
    .filter(d => d.value !== '' && d.text && !d.text.includes('ಆಯ್ಕೆ ಮಾಡಿ'));

  return { token, cookies, districts };
}

async function fetchTreks(districtId: string, token: string, cookies: string) {
  const params = new URLSearchParams();
  params.append('_token', token);
  params.append('district_id', districtId);
  
  const res = await fetch(`${ARANYA_API.BASE_URL}${ARANYA_API.ENDPOINTS.GET_TREKS}`, {
    method: 'POST',
    headers: { ...ARANYA_API.DEFAULT_HEADERS, 'Cookie': cookies },
    body: params.toString()
  });
  
  const data = await res.json();
  return data.map((t: any) => ({ value: t.id.toString(), text: t.name || t.name_kn }));
}

async function fetchBlockedDates(districtId: string, trekId: string, token: string, cookies: string) {
  const params = new URLSearchParams();
  params.append('_token', token);
  params.append('district_id', districtId);
  params.append('trek_id', trekId);
  
  const res = await fetch(`${ARANYA_API.BASE_URL}${ARANYA_API.ENDPOINTS.GET_BLOCKED_DATES}`, {
    method: 'POST',
    headers: { ...ARANYA_API.DEFAULT_HEADERS, 'Cookie': cookies },
    body: params.toString()
  });
  
  const data = await res.json();
  return data.blockedDates || [];
}

// --- Main API Route ---
export async function POST(request: Request) {
  const body = await request.json();
  const { action, district, trek } = body;
  
  const cachePath = path.join(process.cwd(), 'data', 'cache.json');

  if (action === 'getCache') {
    try {
      if (fs.existsSync(cachePath)) {
        const cache = fs.readFileSync(cachePath, 'utf8');
        return NextResponse.json(JSON.parse(cache));
      }
      return NextResponse.json({ lastUpdated: null, data: [] });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  try {
    const auth = await getSessionAuth();

    if (action === 'getDistricts') {
      return NextResponse.json({ districts: auth.districts });
    }

    if (action === 'getTreks') {
      const treks = await fetchTreks(district, auth.token, auth.cookies);
      return NextResponse.json({ treks });
    }

    if (action === 'getAvailability') {
      const blockedDates = await fetchBlockedDates(district, trek, auth.token, auth.cookies);
      const dateWindow = getNext15Days();
      
      const calendarData = dateWindow.map(date => {
        const isAvailable = !blockedDates.includes(date);
        return {
          date,
          text: isAvailable ? 'Available' : 'Full / Blocked',
          bg: isAvailable ? 'rgb(0, 128, 0)' : 'transparent',
          isAvailable
        };
      });

      return NextResponse.json({ availability: calendarData });
    }

    if (action === 'syncAll') {
      const results: any[] = [];
      const { districts, token, cookies } = auth;

      for (const d of districts) {
        // To be polite to the server and prevent IP bans, add a small delay
        await new Promise(r => setTimeout(r, 500)); 
        
        const treks = await fetchTreks(d.value, token, cookies);
        for (const t of treks) {
          const blockedDates = await fetchBlockedDates(d.value, t.value, token, cookies);
          const dateWindow = getNext15Days();
          
          const calendarData = dateWindow.map(date => {
            const isAvailable = !blockedDates.includes(date);
            return {
              date,
              text: isAvailable ? 'Available' : 'Full / Blocked',
              bg: isAvailable ? 'rgb(0, 128, 0)' : 'transparent',
              isAvailable
            };
          });

          results.push({ district: d, trek: t, availability: calendarData });
        }
      }

      const cacheData = {
        lastUpdated: new Date().toISOString(),
        data: results
      };

      if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
        fs.mkdirSync(path.join(process.cwd(), 'data'));
      }
      fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2));

      return NextResponse.json(cacheData);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
