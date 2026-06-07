'use client';
import { useState, useEffect } from 'react';

type Option = { value: string; text: string };
type DayData = { date: string; text: string; bg: string; isAvailable: boolean };
type CachedData = { district: Option, trek: Option, availability: DayData[] };
type LanguageSetting = 'default' | 'english' | 'kannada';

export default function Home() {
  // Global States
  const [language, setLanguage] = useState<LanguageSetting>('default');
  const [cachedItems, setCachedItems] = useState<CachedData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSync, setLoadingSync] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // Dropdown States
  const [districts, setDistricts] = useState<Option[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [treks, setTreks] = useState<Option[]>([]);
  const [selectedTrek, setSelectedTrek] = useState("");
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  // Init
  useEffect(() => {
    fetchCache();
    fetchDistricts();
  }, []);

  // --- Core API Helpers ---
  const fetchCache = () => {
    setLoadingInitial(true);
    try {
      const cache = localStorage.getItem('trek_cache');
      if (cache) {
        const parsed = JSON.parse(cache);
        setCachedItems(parsed.data);
        setLastUpdated(parsed.lastUpdated);
      }
    } catch (e) {}
    setLoadingInitial(false);
  };

  const fetchDistricts = async () => {
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getDistricts' })
      });
      const data = await res.json();
      if (data.districts) setDistricts(data.districts);
    } catch (e) {
      console.error("Failed to load initial districts", e);
    }
  };

  // --- Handlers ---
  const handleDistrictChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDistrict(val);
    setSelectedTrek("");
    setTreks([]);
    if (!val) return;

    setLoadingDropdowns(true);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getTreks', district: val })
      });
      const data = await res.json();
      if (data.treks) setTreks(data.treks);
    } catch (e) {
      console.error(e);
    }
    setLoadingDropdowns(false);
  };

  const handleQuickCheck = async () => {
    if (!selectedDistrict || !selectedTrek) return;
    
    setLoadingSync(true);
    setLoadingMessage("Checking trek...");
    
    try {
      const dOpt = districts.find(d => d.value === selectedDistrict) || { value: selectedDistrict, text: 'Unknown' };
      const tOpt = treks.find(t => t.value === selectedTrek) || { value: selectedTrek, text: 'Unknown' };

      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getAvailability', district: selectedDistrict, trek: selectedTrek })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const newItem = { district: dOpt, trek: tOpt, availability: data.availability };
      
      // We will put this quick check result at the very top of our view, or replace the entire view
      setCachedItems([newItem]);
      setLastUpdated(new Date().toISOString());
      
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    
    setLoadingSync(false);
    setLoadingMessage("");
  };

  const handleSyncAll = async () => {
    if (!confirm("This will fetch live data for ALL treks directly from the portal. It may take a minute. Continue?")) return;
    
    setLoadingSync(true);
    try {
      setLoadingMessage("Fetching districts...");
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getDistricts' })
      });
      const dData = await res.json();
      if (dData.error) throw new Error(dData.error);
      const fetchedDistricts = dData.districts;
      
      const newCache: CachedData[] = [];
      
      for (const d of fetchedDistricts) {
        setLoadingMessage(`Finding treks in ${formatName(d.text)}...`);
        const tRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getTreks', district: d.value })
        });
        const tData = await tRes.json();
        if (tData.error) throw new Error(tData.error);
        
        for (const t of tData.treks) {
          setLoadingMessage(`Checking ${formatName(t.text)}...`);
          const aRes = await fetch('/api/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getAvailability', district: d.value, trek: t.value })
          });
          const aData = await aRes.json();
          if (aData.error) throw new Error(aData.error);
          
          newCache.push({ district: d, trek: t, availability: aData.availability });
          setCachedItems([...newCache]); 
        }
      }
      
      const cacheData = {
        lastUpdated: new Date().toISOString(),
        data: newCache
      };
      
      localStorage.setItem('trek_cache', JSON.stringify(cacheData));
      setLastUpdated(cacheData.lastUpdated);
      
    } catch (e: any) {
      alert(`Failed to sync: ${e.message || 'Unknown error'}`);
    }
    setLoadingSync(false);
    setLoadingMessage("");
  };

  // --- Formatters ---
  const formatName = (text: string) => {
    if (language === 'default') return text;
    
    if (language === 'english') {
      const englishText = text.replace(/[\u0C80-\u0CFF]/g, '').replace(/[-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      return englishText || text;
    }
    
    if (language === 'kannada') {
      // Keep only Kannada unicode, spaces, and simple punctuation
      const kannadaText = text.replace(/[a-zA-Z0-9]/g, '').replace(/[-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      return kannadaText || text;
    }
    
    return text;
  };

  return (
    <div className="container">
      <header>
        <h1>Aranya Vihaara</h1>
      </header>

      {/* Main Controls Panel */}
      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2>Quick Search</h2>
          
          <div className="segmented-control">
            <div className={`segment ${language === 'default' ? 'active' : ''}`} onClick={() => setLanguage('default')}>Default</div>
            <div className={`segment ${language === 'english' ? 'active' : ''}`} onClick={() => setLanguage('english')}>English</div>
            <div className={`segment ${language === 'kannada' ? 'active' : ''}`} onClick={() => setLanguage('kannada')}>ಕನ್ನಡ</div>
          </div>
        </div>

        <div className="form-grid">
          <div className="input-group">
            <label>Select District</label>
            <select value={selectedDistrict} onChange={handleDistrictChange} disabled={loadingSync || districts.length === 0}>
              <option value="">-- Choose District --</option>
              {districts.map(d => (
                <option key={d.value} value={d.value}>{formatName(d.text)}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Select Trek</label>
            <select value={selectedTrek} onChange={(e) => setSelectedTrek(e.target.value)} disabled={loadingSync || treks.length === 0 || loadingDropdowns}>
              <option value="">{loadingDropdowns ? 'Loading treks...' : '-- Choose Trek --'}</option>
              {treks.map(t => (
                <option key={t.value} value={t.value}>{formatName(t.text)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <button 
            onClick={handleQuickCheck} 
            disabled={loadingSync || !selectedTrek}
            style={{ flex: 1 }}
          >
            {loadingSync && selectedTrek ? <span className="loading-spinner"></span> : null} Check Trek
          </button>
          
          <button 
            onClick={handleSyncAll} 
            disabled={loadingSync}
            style={{ flex: 1, background: loadingSync ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--accent-color)', color: loadingSync ? '#fff' : 'var(--accent-color)', boxShadow: 'none' }}
          >
            {loadingSync && !selectedTrek ? (
               <><span className="loading-spinner"></span> {loadingMessage || 'Syncing...'}</>
            ) : '↻ Sync All Treks'}
          </button>
        </div>
      </div>

      {/* Results View */}
      {loadingInitial ? (
        <div className="empty-state">
           <span className="loading-spinner"></span>
           <p style={{ marginTop: '1rem' }}>Loading cached database...</p>
        </div>
      ) : cachedItems.length === 0 ? (
        <div className="empty-state">
           <p>No availability loaded. Select a trek above or click "Sync All Treks".</p>
        </div>
      ) : (
        <div>
          {lastUpdated && cachedItems.length > 1 && (
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'right', fontSize: '0.9rem' }}>
              Last sync: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {cachedItems.map((item, idx) => {
              const availableDays = item.availability.filter(d => d.isAvailable);
              
              return (
                <div key={idx} className="glass-panel" style={{ padding: '1.5rem', marginBottom: 0 }}>
                  <h3>
                    <span style={{ color: 'var(--accent-color)' }}>{formatName(item.district.text)}</span> <span style={{ opacity: 0.3 }}>&mdash;</span> {formatName(item.trek.text)}
                  </h3>
                  
                  {availableDays.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '2rem 0' }}>
                      No open slots available in the next 15 days.
                    </p>
                  ) : (
                    <div className="calendar-grid">
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
                          <div key={i} className="day-card available">
                            <div className="date-text highlight">{formattedDate}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  );
}
