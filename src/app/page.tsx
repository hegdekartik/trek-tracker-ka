'use client';
import { useState, useEffect } from 'react';

type Option = { value: string; text: string };
type DayData = { date: string; text: string; bg: string; isAvailable: boolean };
type CachedData = { district: Option, trek: Option, availability: DayData[] };
type LanguageSetting = 'default' | 'english' | 'kannada';

// Hardcoded translations for Districts since the API only returns Kannada
const districtMap: Record<string, string> = {
  'ಚಿಕ್ಕಬಳ್ಳಾಪುರ': 'Chikkaballapura',
  'ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ': 'Bengaluru Rural',
  'ದಕ್ಷಿಣ ಕನ್ನಡ': 'Dakshina Kannada',
  'ಬೆಳಗಾವಿ': 'Belagavi',
  'ಚಾಮರಾಜನಗರ': 'Chamarajanagara',
  'ಕೊಡಗು': 'Kodagu',
  'ಚಿಕ್ಕಮಗಳೂರು': 'Chikkamagaluru',
  'ಉತ್ತರ ಕನ್ನಡ': 'Uttara Kannada',
  'ಶಿವಮೊಗ್ಗ': 'Shivamogga',
  'ಹಾಸನ': 'Hassan',
  'ಉಡುಪಿ': 'Udupi',
  'ಧಾರವಾಡ': 'Dharwad',
  'ರಾಮನಗರ': 'Ramanagara',
  'ತುಮಕೂರು': 'Tumakuru',
  'ಮೈಸೂರು': 'Mysuru',
};

export default function Home() {
  // Global States
  const [language, setLanguage] = useState<LanguageSetting>('default');
  const [cachedItems, setCachedItems] = useState<CachedData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  
  // Loading States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingSync, setLoadingSync] = useState(false);
  
  // Dropdown States
  const [districts, setDistricts] = useState<Option[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [treks, setTreks] = useState<Option[]>([]);
  const [selectedTrek, setSelectedTrek] = useState("");
  const [loadingDropdowns, setLoadingDropdowns] = useState(false);

  const [selectedSlotDate, setSelectedSlotDate] = useState<string | null>(null);
  const [slotData, setSlotData] = useState<any[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    fetchCache();
    fetchDistricts();
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
      
      setCachedItems([newItem]);
      setLastUpdated(new Date().toISOString());
      
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    }
    
    setLoadingSync(false);
  };

  const handleSyncAll = async () => {
    if (!confirm("This will fetch live data for ALL treks directly from the portal. It may take a minute. Continue?")) return;
    
    setLoadingSync(true);
    try {
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
        const tRes = await fetch('/api/scrape', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getTreks', district: d.value })
        });
        const tData = await tRes.json();
        if (tData.error) throw new Error(tData.error);
        
        for (const t of tData.treks) {
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
  };

  const fetchSlots = async (districtValue: string, trekValue: string, dateStr: string) => {
    setSelectedSlotDate(`${districtValue}-${trekValue}-${dateStr}`);
    setLoadingSlots(true);
    setSlotData(null);
    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getSlots', district: districtValue, trek: trekValue, check_in: dateStr })
      });
      const data = await res.json();
      if (data.slots) setSlotData(data.slots);
    } catch (e) {
      console.error(e);
    }
    setLoadingSlots(false);
  };

  const formatName = (text: string) => {
    if (language === 'default') return text;
    
    let processed = text;
    
    // Auto-translate known districts to English if requested
    if (language === 'english') {
      Object.keys(districtMap).forEach(kannadaKey => {
        if (processed.includes(kannadaKey)) {
          processed = processed.replace(kannadaKey, districtMap[kannadaKey]);
        }
      });
      
      // Strip remaining Kannada
      const englishText = processed.replace(/[\u0C80-\u0CFF]/g, '').replace(/[-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
      return englishText || text;
    }
    
    if (language === 'kannada') {
      // Strip English letters
      const kannadaText = processed.replace(/[a-zA-Z0-9]/g, '').replace(/[-\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
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
            style={{ flex: 1, background: loadingSync ? 'rgba(255,255,255,0.1)' : 'transparent', border: '1px solid var(--glass-border)', color: loadingSync ? '#fff' : 'var(--text-color)', boxShadow: 'none' }}
          >
            {loadingSync && !selectedTrek ? (
               <><span className="loading-spinner"></span> Syncing all...</>
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
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'right', fontSize: '0.85rem' }}>
              Last sync: {new Date(lastUpdated).toLocaleString()}
            </p>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {cachedItems.map((item, idx) => {
              const availableDays = item.availability.filter(d => d.isAvailable);
              
              return (
                <div key={idx} className="glass-panel" style={{ padding: '1.25rem', marginBottom: 0 }}>
                  <h3>
                    <span style={{ color: 'var(--accent-color)' }}>{formatName(item.district.text)}</span> <span style={{ opacity: 0.3 }}>&mdash;</span> {formatName(item.trek.text)}
                  </h3>
                  
                  {availableDays.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                      No open slots available in the next 15 days.
                    </p>
                  ) : (
                    <div className="pill-container">
                      {availableDays.map((day, i) => {
                        let formattedDate = day.date;
                        try {
                          const [d, m, y] = day.date.split('-');
                          const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                          formattedDate = `${parseInt(d)} ${month}`;
                        } catch (e) {}
                        
                        const isSelected = selectedSlotDate === `${item.district.value}-${item.trek.value}-${day.date}`;

                        return (
                          <div 
                            key={i} 
                            className="date-pill"
                            style={{ cursor: 'pointer', background: isSelected ? 'var(--accent-color)' : '', color: isSelected ? '#000' : '' }}
                            onClick={() => fetchSlots(item.district.value, item.trek.value, day.date)}
                          >
                            {formattedDate}
                          </div>
                        );
                      })}
                    </div>
                    {availableDays.some(day => selectedSlotDate === `${item.district.value}-${item.trek.value}-${day.date}`) && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: '#111', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                        {loadingSlots ? (
                          <div className="empty-state" style={{ padding: '0.5rem' }}><span className="loading-spinner"></span> Checking slots...</div>
                        ) : slotData && slotData.length > 0 ? (
                          <div>
                            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>Available Timeslots:</h4>
                            {slotData.map((slot, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: idx === slotData.length - 1 ? 'none' : '1px solid #222' }}>
                                <span style={{ fontWeight: 500 }}>{slot.time}</span>
                                <span style={{ color: 'var(--accent-color)' }}>{slot.availability}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{ color: 'var(--danger-color)', padding: '0.5rem', textAlign: 'center' }}>No slots available or failed to fetch.</div>
                        )}
                      </div>
                    )}
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
