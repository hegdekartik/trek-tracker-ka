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
                
                {item.availability.length === 0 ? (
                  <p style={{ color: '#64748b' }}>No availability calendar found for this trek.</p>
                ) : (
                  <div className="calendar-grid" style={{ marginTop: 0 }}>
                    {item.availability.map((day, i) => {
                      const cleanText = day.text.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                      const isAvailable = day.isAvailable;
                      const statusClass = isAvailable ? 'available' : 'full';
                      
                      return (
                        <div key={i} className={`day-card ${statusClass}`} style={{ padding: '1rem', minHeight: '100px' }}>
                          <div className="date-text" style={{ fontSize: '1rem' }}>{day.date || i + 1}</div>
                          <div className={`status-badge ${statusClass}`} style={{ margin: '0.25rem 0' }}>
                            {isAvailable ? 'Open' : 'Full / Closed'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', wordBreak: 'break-word', overflow: 'hidden' }}>
                            {cleanText.substring(0, 30)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
}
