import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Building2, Calendar, ClipboardCheck, ToggleLeft, ToggleRight, Sun, Moon } from 'lucide-react';

export default function DeliveryForm() {
  // Database state lists
  const [driversList, setDriversList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  // Form input states
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('cans'); // 'cans' or 'liters'
  const [inputValue, setInputValue] = useState('');
  const [selectedShift, setSelectedShift] = useState('Morning');
  const [liveTracking, setLiveTracking] = useState(false);
  const [customEntryDate, setCustomEntryDate] = useState(''); // 🟢 NEW STATE FOR BACKDATING

  // Toast notification state
  const [toast, setToast] = useState('');
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Load Drivers and Clients from Supabase on startup
  useEffect(() => {
    const loadFormOptions = async () => {
      const { data: drivers } = await supabase.from('drivers').select('*').order('name');
      const { data: companies } = await supabase.from('companies').select('*').order('name');
      setDriversList(drivers || []);
      setCompaniesList(companies || []);
    };
    loadFormOptions();
  }, []);

  // Form submission handler
  const handleSubmitDeliveryLogs = async (e) => {
    e.preventDefault();

    // Validations
    if (!selectedDriverId) return alert('Please select your name.');
    if (!selectedCompanyId) return alert('Please select a client destination.');
    if (!inputValue || parseFloat(inputValue) <= 0) return alert('Please enter a valid quantity.');

    // Calculate final cans based on the unit selector switch
    let finalCansCount = parseFloat(inputValue);
    if (measurementUnit === 'liters') {
      // Find company standard container volume multiplier (Default 20L per Can)
      const matchedCompany = companiesList.find(c => c.id === parseInt(selectedCompanyId));
      const litersPerCan = matchedCompany?.liters_per_can ? parseInt(matchedCompany.liters_per_can) : 20;
      finalCansCount = finalCansCount / litersPerCan;
    }

    // 1. Build Payload
    const deliveryPayload = {
      driver_id: parseInt(selectedDriverId),
      company_id: parseInt(selectedCompanyId),
      cans_delivered: finalCansCount,
      shift: selectedShift === 'Morning' ? 'Morning' : 'Evening'
    };

    // 2. 🟢 OVERRIDE TIMESTAMP IF CUSTOM DATE IS SELECTED (BACKDATING)
    if (customEntryDate) {
      const currentClockTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
      deliveryPayload.created_at = `${customEntryDate}T${currentClockTime}`;
    }

    try {
      const { error } = await supabase.from('deliveries').insert([deliveryPayload]);
      if (error) throw error;

      showToast('🎉 Delivery log submitted successfully!');
      
      // Reset variables
      setInputValue('');
      setCustomEntryDate('');
    } catch (err) {
      console.error(err);
      alert(`Submission error: ${err.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {toast && (
        <div style={{ position: 'fixed', top: '24px', backgroundColor: '#0284c7', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontWeight: '700', zIndex: 99999, boxShadow: '0 10px 15px -3px rgba(2,132,199,0.3)' }}>
          {toast}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', height: 'fit-content' }}>
        <form onSubmit={handleSubmitDeliveryLogs}>
          
          {/* 1. SELECT YOUR NAME */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
              <User size={14} style={{ color: '#0284c7' }} /> SELECT YOUR NAME
            </label>
            <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', color: '#0f172a', outline: 'none' }}>
              <option value="">-- Choose Name --</option>
              {driversList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* 2. SELECT CLIENT DESTINATION */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
              <Building2 size={14} style={{ color: '#0284c7' }} /> SELECT CLIENT DESTINATION
            </label>
            <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', color: '#0f172a', outline: 'none' }}>
              <option value="">-- Choose Client Destination --</option>
              {companiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* 3. CHOOSE MEASUREMENT UNIT */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'flex', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
              CHOOSE MEASUREMENT UNIT
            </label>
            <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
              <button type="button" onClick={() => setMeasurementUnit('cans')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: measurementUnit === 'cans' ? '#0284c7' : 'transparent', color: measurementUnit === 'cans' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}>
                By Cans Count
              </button>
              <button type="button" onClick={() => setMeasurementUnit('liters')} style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '700', fontSize: '13px', backgroundColor: measurementUnit === 'liters' ? '#0284c7' : 'transparent', color: measurementUnit === 'liters' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}>
                By Water Liters
              </button>
            </div>
          </div>

          {/* 4. QUANTITY INPUT & SHIFT ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
                <ClipboardCheck size={14} style={{ color: '#0284c7' }} /> ENTER TOTAL {measurementUnit.toUpperCase()}
              </label>
              <input type="number" step="any" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="e.g. 25" style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontWeight: '600', color: '#0f172a', outline: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
                {selectedShift === 'Morning' ? <Sun size={14} style={{ color: '#f59e0b' }} /> : <Moon size={14} style={{ color: '#6366f1' }} />} SELECT SHIFT
              </label>
              <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', color: '#0f172a', outline: 'none' }}>
                <option value="Morning">☀️ Morning Shift</option>
                <option value="Evening">🌙 Evening Shift</option>
              </select>
            </div>
          </div>

          {/* 5. 🟢 NEW FIELD: BACKDATE MISSING LOG ENTRY SELECTOR */}
          <div style={{ marginBottom: '24px', backgroundColor: '#f0f9ff', padding: '14px', borderRadius: '14px', border: '1px dashed #bae6fd' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '6px', letterSpacing: '0.05em' }}>
              <Calendar size={14} /> SELECT LOG DATE (FOR MISSED ENTRIES)
            </label>
            <input 
              type="date" 
              value={customEntryDate} 
              onChange={e => setCustomEntryDate(e.target.value)} 
              max={getLocalISODateString(new Date())}
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '13px', color: '#0369a1', outline: 'none' }} 
            />
            <p style={{ margin: '4px 0 0 0', fontSize: '10.5px', color: '#64748b', fontWeight: '500', lineHeight: '1.4' }}>
              * Leave blank for today. Select a past calendar date to manually record an entry missed on that day.
            </p>
          </div>

          {/* 6. START LIVE TRACKING TOGGLE SWITCH */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '14px', marginBottom: '28px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>🚀 Start Live Tracking</span>
            <div onClick={() => setLiveTracking(!liveTracking)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: liveTracking ? '#0284c7' : '#94a3b8', transition: 'all 0.2s' }}>
              {liveTracking ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
            </div>
          </div>

          {/* 7. SUBMIT DELIVERY LOGS BUTTON */}
          <button type="submit" style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '14px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.2)', transition: 'all 0.2s' }} onMouseEnter={e => e.target.style.backgroundColor = '#0369a1'} onMouseLeave={e => e.target.style.backgroundColor = '#0284c7'}>
            Submit Delivery Logs
          </button>

        </form>
      </div>
    </div>
  );
}