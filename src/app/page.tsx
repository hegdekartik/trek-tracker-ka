'use client';
import { useState, useEffect } from 'react';

type Option = { value: string; text: string };
type DayData = { date: string; text: string; bg: string; isAvailable: boolean };
type CachedData = { district: Option, trek: Option, availability: DayData[] };

export default function Home() {
  const [cachedItems, setCachedItems] = useState<CachedData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("");

  useEffect(() => {
    fetchCache();
  }, []);

  const fetchCache = () => {
    setLoadingInitial(true);
    try {
      const cache = localStorage.getItem('trek_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        setCachedItems(parsed.data);
        setLastUpdated(parsed.lastUpdated);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingInitial(false);
  };

  const handleSyncAll = async () => {
    if (!confirm("This will fetch live data directly from the portal. It may take a minute. Continue?")) return;
    
    setLoadingSync(true);
    try {
      setLoadingMessage("Fetching districts...");
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getDistricts' })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const { districts } = data;
      
      const newCache = [];
      
      for (const d of districts) {
        setLoadingMessage(`Finding treks in ${d.text}...`);
        const tRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getTreks', district: d.value })
        });
        const tData = await tRes.json();
        if (tData.error) throw new Error(tData.error);
        const { treks } = tData;
        
        for (const t of treks) {
          setLoadingMessage(`Checking ${t.text}...`);
          const aRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getAvailability', district: d.value, trek: t.value })
          });
          const aData = await aRes.json();
          if (aData.error) throw new Error(aData.error);
          const { availability } = aData;
          
          newCache.push({ district: d, trek: t, availability });
          setCachedItems([...newCache]); // progressive update
        }
      }
      
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        data: newCache
      };
      
      localStorage.setItem('trek_cache', JSON.stringify(cacheData));
      setLastUpdated(cacheData.lastUpdated);
      
    } catch (e: any) {
      console.error(e);
      alert(`Failed to sync: ${e.message || 'Unknown error'}`);
    }
    setLoadingSync(false);
    setLoadingMessage("");
  };

  return (
    <div className="container">
      <header>
        <h1>Aranya Vihara Tracker</h1>
      </header>

      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.25rem', color: '#e2e8f0' }}>Availability Overview</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
              {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No data loaded yet.'}
            </p>
          </div>
          <button 
            onClick={handleSyncAll} 
            disabled={loadingSync}
            style={{ background: loadingSync ? '#475569' : 'var(--accent-color)' }}
          >
            {loadingSync ? (
               <><span className="loading-spinner"></span> {loadingMessage || 'Checking dates...'}</>
            ) : '↻ Refresh Availability'}
          </button>
        </div>
      </div>

      {loadingInitial ? (
        <div className="empty-state">
           <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#34d399', width: 40, height: 40, borderWidth: 4 }}></span>
           <p style={{ marginTop: '1rem' }}>Loading cached database...</p>
        </div>
      ) : cachedItems.length === 0 ? (
        <div className="empty-state">
           <p>Database is empty. Click "Refresh Availability" to fetch the latest dates from the portal.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {cachedItems.map((item, idx) => {
            return (
              <div key={idx} className="glass-panel" style={{ padding: '1.5rem', marginBottom: 0 }}>
                <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', marginBottom: '1.5rem', color: '#f8fafc' }}>
                  <span style={{ color: 'var(--accent-color)', fontWeight: 800 }}>{item.district.text}</span> <span style={{ opacity: 0.5 }}>&mdash;</span> {item.trek.text}
                </h3>
                
                {(() => {
                  const availableDays = item.availability.filter(d => d.isAvailable);
                  if (availableDays.length === 0) {
                    return <p style={{ color: '#64748b', fontStyle: 'italic' }}>No open slots available in the next 15 days.</p>;
                  }

                  return (
                    <div className="calendar-grid" style={{ marginTop: 0 }}>
                      {availableDays.map((day, i) => {
                        let formattedDate = day.date;
                        try {
                          const [d, m, y] = day.date.split('-');
                          const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                          const dayOfWeek = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                          formattedDate = `${dayOfWeek}, ${parseInt(d)} ${month}`;
                        } catch (e) {}
                        
                        return (
                          <div key={i} className="day-card available" style={{ padding: '1rem', minHeight: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            <div className="date-text" style={{ fontSize: '1.1rem', color: '#34d399', margin: 0 }}>{formattedDate}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
