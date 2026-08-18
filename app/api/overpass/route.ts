import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { lat, lon } = await request.json();

    if (!lat || !lon) {
      return NextResponse.json({ error: 'Missing coordinates' }, { status: 400 });
    }

    const query = `
      [out:json][timeout:15];
      (
        node["leisure"="pitch"](around:15000,${lat},${lon});
        way["leisure"="pitch"](around:15000,${lat},${lon});
        node["leisure"="sports_centre"](around:15000,${lat},${lon});
        way["leisure"="sports_centre"](around:15000,${lat},${lon});
        node["sport"~"soccer|football|futbol"](around:15000,${lat},${lon});
        way["sport"~"soccer|football|futbol"](around:15000,${lat},${lon});
      );
      out center 50;
    `;

    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SalvaElFutbol-Vercel-Proxy'
      },
      next: { revalidate: 3600 } // cache responses for 1 hour to prevent rate limits
    });

    if (!res.ok) {
      throw new Error(`Overpass API responded with status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Overpass Proxy Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
