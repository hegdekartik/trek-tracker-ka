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

  useEffect(() => {
    fetchCache();
  }, []);

  const fetchCache = async () => {
    setLoadingInitial(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getCache' })
      });
      const data = await res.json();
      if (data.data) {
        setCachedItems(data.data);
        setLastUpdated(data.lastUpdated);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingInitial(false);
  };

  const handleSyncAll = async () => {
    if (!confirm("This will scrape all districts and treks. It may take several minutes. Continue?")) return;
    
    setLoadingSync(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'syncAll' })
      });
      const data = await res.json();
      if (data.data) {
        setCachedItems(data.data);
        setLastUpdated(data.lastUpdated);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to sync. Please try again.");
    }
    setLoadingSync(false);
  };

  return (
    <div className="container">
      <header>
        <h1>Aranya Vihaara</h1>
        <p className="subtitle">Automated Master Database Tracker</p>
      </header>

      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Global Availability Cache</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            {lastUpdated ? `Last updated: ${new Date(lastUpdated).toLocaleString()}` : 'No data cached yet.'}
          </p>
        </div>
        <button 
          onClick={handleSyncAll} 
          disabled={loadingSync}
          style={{ background: loadingSync ? '#475569' : 'linear-gradient(45deg, #10b981, #059669)' }}
        >
          {loadingSync ? (
             <><span className="loading-spinner"></span> Syncing database... (May take 3+ mins)</>
          ) : '🔁 Sync All Datasets'}
        </button>
      </div>

      {loadingInitial ? (
        <div className="empty-state">
           <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: '#34d399', width: 40, height: 40, borderWidth: 4 }}></span>
           <p style={{ marginTop: '1rem' }}>Loading cached database...</p>
        </div>
      ) : cachedItems.length === 0 ? (
        <div className="empty-state">
           <p>Database is empty. Click "Sync All Datasets" to scrape the latest availability.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {cachedItems.map((item, idx) => {
            // Group by district -> trek
            return (
              <div key={idx} className="glass-panel" style={{ padding: '1.5rem', marginBottom: 0 }}>
                <h3 style={{ fontSize: '1.4rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
                  <span style={{ color: '#34d399' }}>{item.district.text}</span> &mdash; {item.trek.text}
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
