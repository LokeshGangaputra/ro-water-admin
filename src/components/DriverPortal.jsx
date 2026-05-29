import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import { User, Building, Clipboard, Navigation, AlertTriangle, CheckCircle, Clock, Layers } from 'lucide-react';

export default function DriverPortal() {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [inputValue, setInputValue] = useState(''); 
  const [deliveryUnit, setDeliveryUnit] = useState('Cans'); // 'Cans' or 'Liters'
  const [shift, setShift] = useState('Morning');
  
  const [submissionStatus, setSubmissionStatus] = useState({ type: '', message: '' });
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    fetchFormBaselines();

    const channel = supabase
      .channel('driver-portal-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, () => fetchFormBaselines())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => fetchFormBaselines())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchFormBaselines = async () => {
    const { data: drv } = await supabase.from('drivers').select('*').order('name', { ascending: true });
    const { data: cmp } = await supabase.from('companies').select('*').order('name', { ascending: true });
    setDrivers(drv || []);
    setCompanies(cmp || []);
  };

  const handleDeliverySubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !selectedCompany || !inputValue) {
      setSubmissionStatus({ type: 'error', message: t('fillAllFields') });
      return;
    }

    setSubmissionStatus({ type: 'loading', message: t('syncingData') });

    const rawNum = parseFloat(inputValue) || 0;
    
    // Calculate the absolute value based on unit choice
    let calculatedCans = deliveryUnit === 'Cans' ? rawNum : rawNum / 20;

    // Safety Fallback Rule: If you did not run the SQL alter table query above, 
    // uncomment the line below to round to the nearest whole integer automatically:
    // calculatedCans = Math.round(calculatedCans);

    const { error } = await supabase.from('deliveries').insert({
      driver_id: parseInt(selectedDriver, 10),
      company_id: parseInt(selectedCompany, 10),
      cans_delivered: parseFloat(calculatedCans.toFixed(2)), // Fixed safe precision floating decimals
      shift: shift
    });

    if (error) {
      setSubmissionStatus({ type: 'error', message: `Database Error: ${error.message}` });
    } else {
      setSubmissionStatus({ type: 'success', message: t('syncSuccess') });
      setInputValue('');
    }
    setTimeout(() => setSubmissionStatus({ type: '', message: '' }), 5000);
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, sans-serif' }}>
      
      {submissionStatus.message && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', fontWeight: '700', backgroundColor: submissionStatus.type === 'success' ? '#ecfdf5' : '#fff7ed', color: submissionStatus.type === 'success' ? '#047857' : '#c2410c', border: `1px solid ${submissionStatus.type === 'success' ? '#a7f3d0' : '#fed7aa'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {submissionStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {submissionStatus.message}
        </div>
      )}

      <h3 style={{ margin: '0 0 4px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>{t('driverPortalTitle')}</h3>
      <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: '#64748b' }}>{t('driverPortalSubtitle')}</p>

      <form onSubmit={handleDeliverySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
            <User size={14} style={{ color: '#0284c7' }} /> {t('selectDriver')}
          </label>
          <select value={selectedDriver} onChange={e => setSelectedDriver(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', outline: 'none', fontWeight: '700' }}>
            <option value="">{t('chooseName')}</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{t('names.' + d.name, d.name)}</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
            <Building size={14} style={{ color: '#0284c7' }} /> {t('selectCompany')}
          </label>
          <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', outline: 'none', fontWeight: '700' }}>
            <option value="">{t('chooseClient')}</option>
            {companies.map(c => <option key={c.id} value={c.id}>{t('names.' + c.name, c.name)} (₹{c.rate_per_can}/can)</option>)}
          </select>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
            <Layers size={14} style={{ color: '#0284c7' }} /> Choose Measurement Unit
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
            <button type="button" onClick={() => { setDeliveryUnit('Cans'); setInputValue(''); }} style={{ padding: '8px', fontSize: '12px', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: deliveryUnit === 'Cans' ? '#0284c7' : 'transparent', color: deliveryUnit === 'Cans' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}>
              By Cans Count
            </button>
            <button type="button" onClick={() => { setDeliveryUnit('Liters'); setInputValue(''); }} style={{ padding: '8px', fontSize: '12px', fontWeight: '800', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: deliveryUnit === 'Liters' ? '#0284c7' : 'transparent', color: deliveryUnit === 'Liters' ? '#ffffff' : '#64748b', transition: 'all 0.2s' }}>
              By Water Liters
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              <Clipboard size={14} style={{ color: '#0284c7' }} /> 
              {deliveryUnit === 'Cans' ? 'Enter Total Cans' : 'Enter Total Liters'}
            </label>
            <input 
              type="number" 
              placeholder={deliveryUnit === 'Cans' ? "e.g. 25" : "e.g. 500"} 
              value={inputValue} 
              onChange={e => setInputValue(e.target.value)} 
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', outline: 'none', fontWeight: '700' }} 
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
              <Clock size={14} style={{ color: '#0284c7' }} /> {t('selectShift')}
            </label>
            <select value={shift} onChange={e => setShift(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#1e293b', outline: 'none' }}>
              <option value="Morning">☀️ {t('morning')}</option>
              <option value="Evening">🌙 {t('evening')}</option>
            </select>
          </div>
        </div>

        <div onClick={() => setIsTracking(!isTracking)} style={{ padding: '12px', borderRadius: '12px', backgroundColor: isTracking ? '#f0f9ff' : '#f1f5f9', border: `1px solid ${isTracking ? '#bae6fd' : '#e2e8f0'}`, display: 'flex', justifyContent: 'space-between', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Navigation size={16} style={{ color: isTracking ? '#0ea5e9' : '#94a3b8' }} />
            <span style={{ fontSize: '12px', fontWeight: '700', color: isTracking ? '#0369a1' : '#475569' }}>{isTracking ? t('trackingOn') : t('trackingOff')}</span>
          </div>
          <div style={{ width: '32px', height: '18px', backgroundColor: isTracking ? '#0ea5e9' : '#cbd5e1', borderRadius: '20px', position: 'relative' }}>
            <div style={{ width: '12px', height: '12px', backgroundColor: '#ffffff', borderRadius: '50%', position: 'absolute', top: '3px', left: isTracking ? '17px' : '3px', transition: 'all 0.2s' }} />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '12px', border: 'none', backgroundColor: '#0284c7', color: '#ffffff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.25)', marginTop: '8px' }}>
          {t('submit')}
        </button>

      </form>
    </div>
  );
}