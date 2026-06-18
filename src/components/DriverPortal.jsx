import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Building2, Calendar, ClipboardCheck, ToggleLeft, ToggleRight, Sun, Moon } from 'lucide-react';

const getLocalISODateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DriverPortal() {
  // Option catalogs loaded from cloud
  const [driversList, setDriversList] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);

  // Form interactive values states
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [measurementUnit, setMeasurementUnit] = useState('cans'); // 'cans' or 'liters'
  const [inputValue, setInputValue] = useState('');
  const [selectedShift, setSelectedShift] = useState('Morning');
  const [liveTracking, setLiveTracking] = useState(false);
  
  // 🟢 NEW STATE: Pre-filled with today's date automatically
  const [deliveryLogDate, setDeliveryLogDate] = useState(() => getLocalISODateString(new Date()));

  const [successToast, setSuccessToast] = useState('');
  const triggerToast = (msg) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  // Pull active system metadata lists
  useEffect(() => {
    const loadConfigurationData = async () => {
      const { data: drivers } = await supabase.from('drivers').select('*').order('name', { ascending: true });
      const { data: companies } = await supabase.from('companies').select('*').order('name', { ascending: true });
      setDriversList(drivers || []);
      setCompaniesList(companies || []);
    };
    loadConfigurationData();
  }, []);

  const handleLogSubmissionEngine = async (e) => {
    e.preventDefault();

    if (!selectedDriverId) return alert('⚠️ Please select your name from the drop-down list.');
    if (!selectedCompanyId) return alert('⚠️ Please select the client destination target.');
    if (!inputValue || parseFloat(inputValue) <= 0) return alert('⚠️ Please input a valid delivery quantity.');

    let operationalCansMath = parseFloat(inputValue);
    
    // Convert liters to cans manually if user opted to input raw fluid volume
    if (measurementUnit === 'liters') {
      const activeClientMeta = companiesList.find(c => c.id === parseInt(selectedCompanyId));
      const litersPerCanMultiplier = activeClientMeta?.liters_per_can ? parseInt(activeClientMeta.liters_per_can, 10) : 20;
      operationalCansMath = operationalCansMath / litersPerCanMultiplier;
    }

    // 1. Build Base Database Insertion Payload
    const logPayload = {
      driver_id: parseInt(selectedDriverId, 10),
      company_id: parseInt(selectedCompanyId, 10),
      cans_delivered: operationalCansMath,
      shift: selectedShift
    };

    // 2. 🟢 BACKDATE ENGINE TIMESTAMP CALCULATOR
    // Combines chosen calendar date with current real clock time so metrics sequence chronologically
    const currentClockTime = new Date().toTimeString().split(' ')[0]; // Returns "HH:MM:SS"
    logPayload.created_at = `${deliveryLogDate}T${currentClockTime}`;

    try {
      const { error } = await supabase.from('deliveries').insert([logPayload]);
      if (error) throw error;

      triggerToast('🎉 Delivery record submitted and synced successfully!');
      
      // Clear numbers input field safely
      setInputValue('');
      // Keep name and client selected to help speed up quick consecutive additions
    } catch (dbErr) {
      console.error("Database submission error context:", dbErr);
      alert(`Submission Blocked: ${dbErr.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      
      {successToast && (
        <div style={{ position: 'fixed', top: '24px', backgroundColor: '#0284c7', color: '#ffffff', padding: '14px 28px', borderRadius: '12px', fontWeight: '700', zIndex: 99999, boxShadow: '0 10px 15px -3px rgba(2,132,199,0.3)' }}>
          {successToast}
        </div>
      )}

      <div style={{ width: '100%', maxWidth: '480px', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', border: '1px solid #e2e8f0', height: 'fit-content' }}>
        
        <div style={{ marginBottom: '28px' }}>
          <h2 style={{ margin: '0 0 6px 0', fontSize: '26px', fontWeight: '900', color: '#0f172a' }}>Driver Dispatch Terminal</h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: '500' }}>Enter your drops accurately. Backdate below if logging a past missed entry.</p>
        </div>

        <form onSubmit={handleLogSubmissionEngine}>
          
          {/* 👤 CHOOSE FLEET OPERATOR */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
              <User size={14} style={{ color: '#0284c7' }} /> SELECT YOUR NAME
            </label>
            <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', color: '#0f172a', outline: 'none' }}>
              <option value="">-- Choose Name --</option>
              {driversList.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* 🏢 CHOOSE TARGET CLIENT PLACE */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#475569', marginBottom: '8px', letterSpacing: '0.05em' }}>
              <Building2 size={14} style={{ color: '#0284c7' }} /> SELECT CLIENT DESTINATION
            </label>
            <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', color: '#0f172a', outline: 'none' }}>
              <option value="">-- Choose Client Destination --</option>
              {companiesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* 📊 SELECT DISPATCH SCALE UNIT METRIC */}
          <div style={{ marginBottom: '20px' }}>
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

          {/* 🔢 QUANTITY CAPACITY & OPERATIONAL CYCLE SHIFT SELECTION ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
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
                <option value="Morning">Morning Shift</option>
                <option value="Evening">Evening Shift</option>
              </select>
            </div>
          </div>

          {/* 🟢 NEW FIELD: LOG TARGET ENTRY DATE SELECTOR WINDOW */}
          <div style={{ marginBottom: '24px', backgroundColor: '#f0f9ff', border: '1px dashed #0ea5e9', padding: '16px', borderRadius: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', color: '#0369a1', marginBottom: '8px', letterSpacing: '0.04em' }}>
              <Calendar size={14} /> TARGET DELIVERY LOG DATE
            </label>
            <input 
              type="date" 
              value={deliveryLogDate} 
              onChange={e => setDeliveryLogDate(e.target.value)} 
              max={getLocalISODateString(new Date())} // Locks future date errors completely
              style={{ width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', fontSize: '14px', color: '#0369a1', outline: 'none', backgroundColor: '#ffffff' }} 
            />
            <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#64748b', fontWeight: '500', lineHeight: '1.4' }}>
              * Change this calendar day specifically if you are trying to entry drops that were missed on a past date.
            </p>
          </div>

          {/* 🚀 TELEMETRY TRACKER TOGGLE SWITCH */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '14px', marginBottom: '24px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#475569' }}>Start Live Tracking</span>
            <div onClick={() => setLiveTracking(!liveTracking)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', color: liveTracking ? '#0284c7' : '#94a3b8' }}>
              {liveTracking ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
            </div>
          </div>

          {/* ⚡ SUBMISSION TRIGGER ACTION */}
          <button type="submit" style={{ width: '100%', padding: '16px', border: 'none', borderRadius: '14px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '800', fontSize: '15px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.2)' }}>
            Submit Delivery Logs
          </button>

        </form>
      </div>
    </div>
  );
}