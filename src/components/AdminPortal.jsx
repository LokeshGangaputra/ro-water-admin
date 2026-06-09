import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, TrendingUp, Layers, ShieldAlert, UserPlus, Building2, Plus, CheckCircle, User, DollarSign, Calendar, Trash2, Edit3, Save, X, Lock, CheckSquare, Square, Bell, RefreshCw, Eye, ArrowLeft, RotateCcw, Download } from 'lucide-react';

const getLocalISODateString = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateToDDMMYYYY = (isoString) => {
  if (!isoString) return '';
  const parts = isoString.split('-');
  if (parts.length !== 3) return isoString;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

export default function AdminPortal() {
  const { t } = useTranslation();
  
  // Base Data States
  const [allDeliveries, setAllDeliveries] = useState([]);
  const [companiesList, setCompaniesList] = useState([]);
  const [driversList, setDriversList] = useState([]);
  
  // Dashboard & Metrics States
  const [viewMode, setViewMode] = useState('monthly');
  const [monthlyCompanyReport, setMonthlyCompanyReport] = useState([]);
  const [monthlyDriverReport, setMonthlyDriverReport] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({ paid: 0, pending: 0, total: 0 });
  const [overdueAlerts, setOverdueAlerts] = useState([]);

  const [cycleStartDate, setCycleStartDate] = useState(() => localStorage.getItem('cfg_cycle_start') || getLocalISODateString(new Date()));

  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [updatedCompanyName, setUpdatedCompanyName] = useState('');

  const [activeSubPanel, setActiveSubPanel] = useState('dashboard');
  const [auditMeta, setAuditMeta] = useState({ type: '', id: null, name: '' });
  
  const [auditStartDate, setAuditStartDate] = useState(() => getLocalISODateString(new Date()));
  const [auditEndDate, setAuditEndDate] = useState(() => getLocalISODateString(new Date()));
  
  const [auditLedgerRecords, setAuditLedgerRecords] = useState([]);
  const [auditCansSum, setAuditCansSum] = useState(0);
  const [auditLitersSum, setAuditLitersSum] = useState(0);
  const [auditRevenueSum, setAuditRevenueSum] = useState(0);
  const [customAuditRate, setCustomAuditRate] = useState(''); // NEW: Custom Rate Override

  const [stats, setStats] = useState({ daily: { v: 0, e: 0 }, weekly: { v: 0, e: 0 }, monthly: { v: 0, e: 0 } });

  const [selectedFilterDate, setSelectedFilterDate] = useState(() => getLocalISODateString(new Date()));
  const [dayFilteredAnalytics, setDayFilteredAnalytics] = useState([]);

  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [updatedCansValue, setUpdatedCansValue] = useState('');

  const [newAdminEmail, setNewAdminEmail] = useState(() => localStorage.getItem('cfg_adm_mail') || 'admin@water.com');
  const [newAdminPass, setNewAdminPass] = useState(() => localStorage.getItem('cfg_adm_key') || 'plant2026');

  const [newDriverName, setNewDriverName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRate, setNewCompanyRate] = useState('20');
  
  const [toastMessage, setToastMessage] = useState('');
  const triggerNotification = (msg) => { 
    setToastMessage(msg); 
    setTimeout(() => setToastMessage(''), 4000); 
  };

  // 🚀 BACKGROUND WORKER: Checks every 30 seconds to upload offline data
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      // Sync Companies
      const compQueue = JSON.parse(localStorage.getItem('offline_companies') || '[]');
      if (compQueue.length > 0) {
        try {
          const cleanData = compQueue.map(({ _local_timestamp, ...rest }) => rest);
          const { error } = await supabase.from('companies').insert(cleanData);
          if (!error) {
            localStorage.removeItem('offline_companies');
            triggerNotification("✅ Connection restored: Offline clients synced!");
            fetchData();
          }
        } catch (e) { /* Still offline/full, try again later */ }
      }

      // Sync Drivers
      const drvQueue = JSON.parse(localStorage.getItem('offline_drivers') || '[]');
      if (drvQueue.length > 0) {
        try {
          const cleanData = drvQueue.map(({ _local_timestamp, ...rest }) => rest);
          const { error } = await supabase.from('drivers').insert(cleanData);
          if (!error) {
            localStorage.removeItem('offline_drivers');
            triggerNotification("✅ Connection restored: Offline drivers synced!");
            fetchData();
          }
        } catch (e) { /* Still offline/full, try again later */ }
      }
    }, 30000);

    return () => clearInterval(syncInterval);
  }, []);

  useEffect(() => {
    fetchData();
    fetchLiveGlobalCycleConfig();

    const realTimeBroker = supabase
      .channel('admin-master-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'global_config' }, fetchLiveGlobalCycleConfig)
      .subscribe();

    return () => supabase.removeChannel(realTimeBroker);
  }, []);

  useEffect(() => {
    calculateComprehensiveMetrics(allDeliveries, companiesList, driversList);
  }, [selectedFilterDate, cycleStartDate, auditMeta, auditStartDate, auditEndDate, viewMode]);

  const fetchLiveGlobalCycleConfig = async () => {
    const { data } = await supabase.from('global_config').select('*').eq('key', 'cycle_start_date').maybeSingle();
    if (data && data.value) setCycleStartDate(data.value);
  };

  const fetchData = async () => {
    const { data: del } = await supabase.from('deliveries').select(`*, companies(*), drivers(*)`).order('created_at', { ascending: false });
    const { data: comp } = await supabase.from('companies').select('*').order('name', { ascending: true });
    const { data: drv } = await supabase.from('drivers').select('*').order('name', { ascending: true });
    
    setAllDeliveries(del || []);
    setCompaniesList(comp || []);
    setDriversList(drv || []);
    calculateComprehensiveMetrics(del || [], comp || [], drv || []);
  };

  const calculateComprehensiveMetrics = (deliveries = allDeliveries, companies = companiesList, drivers = driversList) => {
    const now = new Date();
    const todayStr = getLocalISODateString(now);
    const oneWeekAgo = new Date(); oneWeekAgo.setDate(now.getDate() - 7);
    
    const anchorDateStr = cycleStartDate;
    const anchorDateObj = new Date(`${cycleStartDate}T00:00:00`);
    const daysTranspiredInCycle = Math.floor((now - anchorDateObj) / (1000 * 60 * 60 * 24));

    let t = { v: 0, e: 0 }, w = { v: 0, e: 0 }, m = { v: 0, e: 0 };

    const companyReportMap = {};
    const driverReportMap = {};
    const singleDayMap = {};

    companies.forEach(c => {
      companyReportMap[c.id] = { id: c.id, name: c.name, cans: 0, liters: 0, billing: 0, is_paid: c.is_paid };
    });
    drivers.forEach(d => {
      driverReportMap[d.id] = { id: d.id, name: d.name, cans: 0, trips: 0 };
    });

    let aCans = 0, aLit = 0, aRev = 0;
    const auditFilteredLogs = [];

    deliveries.forEach(item => {
      const createdDate = new Date(item.created_at);
      const itemDateStr = getLocalISODateString(createdDate); 
      const cans = parseFloat(item.cans_delivered) || 0;
      
      const compMeta = item.companies || {};
      const rate = compMeta.rate_per_can ? parseFloat(compMeta.rate_per_can) : 20;
      const litPerCan = compMeta.liters_per_can ? parseInt(compMeta.liters_per_can, 10) : 20;
      
      const volume = cans * litPerCan;
      const earnings = cans * rate;

      if (itemDateStr === todayStr) { t.v += volume; t.e += earnings; }
      if (createdDate >= oneWeekAgo) { w.v += volume; w.e += earnings; }

      if (itemDateStr >= anchorDateStr) {
        m.v += volume; m.e += earnings;
        if (item.company_id && companyReportMap[item.company_id]) {
          companyReportMap[item.company_id].cans += cans;
          companyReportMap[item.company_id].liters += volume;
          companyReportMap[item.company_id].billing += earnings;
        }
        if (item.driver_id && driverReportMap[item.driver_id]) {
          driverReportMap[item.driver_id].cans += cans;
          driverReportMap[item.driver_id].trips += 1;
        }
      }

      if (itemDateStr === selectedFilterDate) {
        const cName = compMeta.name || 'Unknown Client';
        if (!singleDayMap[cName]) singleDayMap[cName] = { name: cName, cans: 0, liters: 0, billing: 0 };
        singleDayMap[cName].cans += cans;
        singleDayMap[cName].liters += volume;
        singleDayMap[cName].billing += earnings;
      }

      if (itemDateStr >= auditStartDate && itemDateStr <= auditEndDate && auditMeta.id) {
        const matchFound = auditMeta.type === 'driver' ? item.driver_id === auditMeta.id : item.company_id === auditMeta.id;
        if (matchFound) {
          aCans += cans; aLit += volume; aRev += earnings;
          auditFilteredLogs.push(item);
        }
      }
    });

    setStats({ daily: t, weekly: w, monthly: m });

    let totalPaid = 0, totalPending = 0;
    const overdueList = [];
    const finalCompanyArr = Object.values(companyReportMap);

    finalCompanyArr.forEach(comp => {
      if (comp.is_paid) totalPaid += comp.billing;
      else {
        totalPending += comp.billing;
        if (daysTranspiredInCycle >= 5 && comp.billing > 0) overdueList.push(comp);
      }
    });

    setFinancialSummary({ paid: totalPaid, pending: totalPending, total: totalPaid + totalPending });
    setOverdueAlerts(overdueList);
    setMonthlyCompanyReport(finalCompanyArr);
    setMonthlyDriverReport(Object.values(driverReportMap));
    setDayFilteredAnalytics(Object.values(singleDayMap));

    auditFilteredLogs.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    setAuditLedgerRecords(auditFilteredLogs);
    setAuditCansSum(aCans); setAuditLitersSum(aLit); setAuditRevenueSum(aRev);
  };

  const launchDeepAuditPanel = (type, id, name) => {
    setAuditMeta({ type, id, name });
    const today = getLocalISODateString(new Date());
    setAuditStartDate(today);
    setAuditEndDate(today);
    setCustomAuditRate(''); // Reset custom rate when opening new audit
    setActiveSubPanel('audit');
  };

  const getFilteredLogs = () => {
    const now = new Date();
    return allDeliveries.filter(log => {
      const date = new Date(log.created_at);
      if (viewMode === 'daily') return getLocalISODateString(date) === getLocalISODateString(now);
      if (viewMode === 'weekly') return date >= new Date(now.setDate(now.getDate() - 7));
      return getLocalISODateString(date) >= cycleStartDate;
    });
  };

  const handleResetBillingCycle = async () => {
    const todayStr = getLocalISODateString(new Date());
    if (window.confirm(`Start a new 30-day billing cycle anchored on today (${formatDateToDDMMYYYY(todayStr)})?`)) {
      const { error: cycleError } = await supabase.from('global_config').upsert({ key: 'cycle_start_date', value: todayStr });
      const { error: resetError } = await supabase.from('companies').update({ is_paid: false }).neq('id', 0);
      if (!cycleError && !resetError) {
        setCycleStartDate(todayStr);
        triggerNotification("New global billing cycle deployed successfully!");
        fetchData();
      }
    }
  };

  const handleResetAllPayments = async () => {
    if (window.confirm("Reset all client payment checkboxes back to Unpaid status in the database?")) {
      const { error } = await supabase.from('companies').update({ is_paid: false }).neq('id', 0);
      if (!error) {
        triggerNotification("All checkboxes reset successfully.");
        fetchData();
      }
    }
  };

  const handleRemoveDeliveryLog = async (id) => {
    if (window.confirm("⚠️ PERMANENT ACTION: Are you sure you want to delete this log?")) {
      try {
        const { error } = await supabase.from('deliveries').delete().eq('id', id);
        if (error) throw error;
        triggerNotification("Record deleted successfully.");
        await fetchData();
      } catch (err) {
        console.error("Deletion failed:", err);
        alert(`Failed to delete record: ${err.message}`);
      }
    }
  };

  const toggleCompanyPaymentStatus = async (companyId, currentStatus) => {
    if (!companyId) return;
    const { error } = await supabase.from('companies').update({ is_paid: !currentStatus }).eq('id', companyId);
    if (!error) {
      triggerNotification(`Status updated to ${!currentStatus ? 'Paid' : 'Unpaid'}`);
      fetchData();
    }
  };

  // 🚀 OFFLINE FALLBACK: Add Driver
  const handleAddDriver = async (e) => {
    e.preventDefault(); if (!newDriverName.trim()) return;
    
    try {
      const { error } = await supabase.from('drivers').insert([{ name: newDriverName.trim(), status: 'inactive' }]);
      if (error) throw error;
      triggerNotification("Driver added!"); setNewDriverName(''); fetchData();
    } catch (err) {
      // Offline Failsafe
      const queue = JSON.parse(localStorage.getItem('offline_drivers') || '[]');
      queue.push({ name: newDriverName.trim(), status: 'inactive', _local_timestamp: Date.now() });
      localStorage.setItem('offline_drivers', JSON.stringify(queue));
      triggerNotification("⚠️ Cloud unavailable! Saved locally. Will sync automatically.");
      setNewDriverName('');
    }
  };

  // 🚀 OFFLINE FALLBACK: Add Company
  const handleAddCompany = async (e) => {
    e.preventDefault(); if (!newCompanyName.trim()) return;

    try {
      const { error } = await supabase.from('companies').insert([{ name: newCompanyName.trim(), rate_per_can: parseFloat(newCompanyRate), liters_per_can: 20 }]);
      if (error) throw error;
      triggerNotification("Client saved safely!"); setNewCompanyName(''); setNewCompanyRate('20'); fetchData();
    } catch (err) {
      // Offline Failsafe
      const queue = JSON.parse(localStorage.getItem('offline_companies') || '[]');
      queue.push({ name: newCompanyName.trim(), rate_per_can: parseFloat(newCompanyRate), liters_per_can: 20, _local_timestamp: Date.now() });
      localStorage.setItem('offline_companies', JSON.stringify(queue));
      triggerNotification("⚠️ Cloud unavailable! Saved locally. Will sync automatically.");
      setNewCompanyName(''); setNewCompanyRate('20');
    }
  };

  const handleSaveUpdatedCans = async (id) => {
    const cansNum = parseFloat(updatedCansValue); if (isNaN(cansNum) || cansNum < 0) return;
    try {
      const { error } = await supabase.from('deliveries').update({ cans_delivered: cansNum }).eq('id', id);
      if (error) throw error;
      triggerNotification("Log edited safely!"); setEditingDeliveryId(null); fetchData();
    } catch (err) {
      alert("⚠️ Cloud Storage Full or Offline. Cannot edit records until connection is restored.");
    }
  };

  const generateCumulativeSummaryInvoice = () => {
    const logsToPrint = activeSubPanel === 'audit' ? auditLedgerRecords : getFilteredLogs();

    if (logsToPrint.length === 0) {
      alert(`No delivery details found for ${auditMeta.name} between ${formatDateToDDMMYYYY(auditStartDate)} and ${formatDateToDDMMYYYY(auditEndDate)}.`);
      return;
    }

    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold"); 
      doc.text("RO WAATER DISPATCH SERVICES", 14, 20);
      doc.setFontSize(11); doc.setFont("helvetica", "normal");
      
      let sumCans = 0, sumLiters = 0, sumAmount = 0;

      if (activeSubPanel === 'audit') {
        doc.text(`Cumulative Statement: ${auditMeta.name}`, 14, 28);
        doc.text(`Filtered Bounds: ${formatDateToDDMMYYYY(auditStartDate)} to ${formatDateToDDMMYYYY(auditEndDate)}`, 14, 34);
        if (customAuditRate) doc.text(`* Billed at Custom Override Rate: Rs. ${customAuditRate}/Can`, 14, 40);
      } else {
        doc.text(`Overview Report: ${viewMode.toUpperCase()}`, 14, 28);
      }

      const dataRows = logsToPrint.map(log => {
        const dateObj = new Date(log.created_at);
        const displayDate = `${String(dateObj.getDate()).padStart(2, '0')}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${dateObj.getFullYear()}`;
        
        const compObject = log.companies || {};
        const driverObject = log.drivers || {};
        
        // 🟢 NEW CUSTOM RATE OVERRIDE LOGIC FOR PDF
        const rate = (activeSubPanel === 'audit' && customAuditRate) 
            ? parseFloat(customAuditRate) 
            : (compObject.rate_per_can ? parseFloat(compObject.rate_per_can) : 20);
            
        const cansCount = parseFloat(log.cans_delivered) || 0;

        sumCans += cansCount; sumLiters += (cansCount * 20); sumAmount += (cansCount * rate);

        return [
          displayDate,
          activeSubPanel === 'audit' && auditMeta.type === 'company' ? (driverObject.name || 'Unknown Driver') : (compObject.name || 'Unknown Facility'),
          log.shift || 'Morning',
          `${cansCount.toFixed(1)}`,
          `${(cansCount * 20).toFixed(0)} L`,
          `Rs. ${(cansCount * rate).toFixed(0)}`
        ];
      });

      autoTable(doc, {
        startY: activeSubPanel === 'audit' && customAuditRate ? 46 : 42,
        head: [['Date', activeSubPanel === 'audit' && auditMeta.type === 'company' ? 'Operated By' : 'Destination', 'Shift', 'Cans', 'Volume', 'Amount']],
        body: dataRows,
      });

      const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 60;
      doc.setFont("helvetica", "bold");
      doc.text(`Total Aggregated Dispatched: ${sumCans.toFixed(1)} Cans (${sumLiters.toLocaleString()} L)`, 14, finalY + 12);
      doc.text(`Net Statement Billing: Rs. ${sumAmount.toLocaleString()}.00`, 14, finalY + 18);

      doc.save(`Report_${activeSubPanel === 'audit' ? auditMeta.name : viewMode}.pdf`);
      triggerNotification("Report compiled correctly!");
    } catch (pdfErr) {
      console.error("PDF Engine Exception:", pdfErr);
      alert(`Print Engine Error: ${pdfErr.message}`);
    }
  };

  const runAutomatedThreeMonthMaintenanceCycle = async () => {
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const logsToPurge = allDeliveries.filter(log => new Date(log.created_at) < ninetyDaysAgo);
    if (logsToPurge.length === 0) return;

    const doc = new jsPDF();
    doc.setFont("helvetica", "bold"); doc.text("ARCHIVED HISTORICAL EXPORT (3-MONTH AUTO-PURGE LEDGER)", 14, 20);
    const rows = logsToPurge.map(log => {
      const d = new Date(log.created_at);
      const displayDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
      return [displayDate, log.drivers?.name || 'Unknown', log.companies?.name || 'Unknown', log.shift, `${log.cans_delivered} Cans`];
    });
    autoTable(doc, { startY: 32, head: [['Date', 'Driver', 'Client', 'Shift', 'Quantity']], body: rows });
    doc.save(`RO_Water_AutoArchived_Report_${getLocalISODateString(new Date())}.pdf`);

    const targetIdsToClear = logsToPurge.map(log => log.id);
    await supabase.from('deliveries').delete().in('id', targetIdsToClear);
    fetchData();
  };

  const handleSaveCompanyNewName = async (companyId) => {
    if (!updatedCompanyName.trim()) return;
    const { error } = await supabase.from('companies').update({ name: updatedCompanyName.trim() }).eq('id', companyId);
    if (!error) {
      triggerNotification("Client name updated safely!");
      setEditingCompanyId(null); setUpdatedCompanyName('');
      fetchData();
    }
  };

  const handleUpdateCredentials = (e) => {
    e.preventDefault(); localStorage.setItem('cfg_adm_mail', newAdminEmail.trim()); localStorage.setItem('cfg_adm_key', newAdminPass.trim());
    triggerNotification("Security parameters updated!");
  };

  const handleRemoveDriver = async (id, name) => {
    if (window.confirm(`Remove driver "${name}"?`)) { await supabase.from('drivers').delete().eq('id', id); fetchData(); }
  };

  const handleRemoveCompany = async (id, name) => {
    if (window.confirm(`Remove client "${name}"?`)) { await supabase.from('companies').delete().eq('id', id); fetchData(); }
  };

  const generateInvoicePDF = (company) => {
    const doc = new jsPDF(); doc.setFont("helvetica", "bold"); doc.text("RO WAATER DISPATCH SERVICES", 14, 20);
    const matchedComp = companiesList.find(c => c.name === company.name) || {};
    const rate = matchedComp.rate_per_can ? parseFloat(matchedComp.rate_per_can) : 20;
    autoTable(doc, { startY: 40, head: [['Operational Parameter', 'Value Metrics']], body: [['Total Cans Supplied', `${company.cans.toFixed(1)} Units`], ['Net Volume Dispatched', `${company.liters.toFixed(0)} Liters`], ['Calculated Outstanding Balance', `Rs. ${(company.cans * rate).toFixed(0)}.00`]] });
    doc.save(`Invoice_${company.name}_${formatDateToDDMMYYYY(selectedFilterDate)}.pdf`);
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '12px' }}>
      
      {toastMessage && (
        <div style={{ position: 'fixed', top: '90px', right: '24px', backgroundColor: '#0284c7', color: '#ffffff', padding: '12px 24px', borderRadius: '12px', fontWeight: '700', fontSize: '13px', zIndex: 99999, boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}><CheckCircle size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} /> {toastMessage}</div>
      )}

      {overdueAlerts.length > 0 && (
        <div style={{ backgroundColor: '#fef2f2', border: '2px solid #ef4444', borderRadius: '24px', padding: '24px', marginBottom: '40px', boxShadow: '0 10px 15px -3px rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#b91c1c', marginBottom: '12px' }}><Bell className="animate-bounce" size={22} /><h4 style={{ margin: 0, fontSize: '15px', fontWeight: '900' }}>CRITICAL OVERDUE ACCOUNT ALERTS (CYCLE BREACH)</h4></div>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#7f1d1d', fontWeight: '600' }}>The 5-day post-cycle grace threshold has expired. The following corporate client profiles are flagged in red due to late balances:</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {overdueAlerts.map((comp, idx) => (
              <span key={idx} style={{ backgroundColor: '#b91c1c', color: '#ffffff', padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' }}>⚠️ {t('names.' + comp.name, comp.name)} — ₹{comp.billing.toFixed(0)} Overdue</span>
            ))}
          </div>
        </div>
      )}

      {/* 📋 SUB-VIEW PORTAL A: DETAILED INDIVIDUAL PROFILE SEPARATE ANALYSIS SCREEN */}
      {activeSubPanel === 'audit' ? (
        <div style={{ backgroundColor: '#ffffff', border: '2px solid #0284c7', borderRadius: '28px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(2,132,199,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button onClick={() => setActiveSubPanel('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', border: '1px solid #cbd5e1', borderRadius: '12px', backgroundColor: '#ffffff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}><ArrowLeft size={16} /> Back to Dashboard</button>
            <button onClick={generateCumulativeSummaryInvoice} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', border: 'none', borderRadius: '12px', backgroundColor: '#10b981', color: '#ffffff', fontWeight: '800', fontSize: '13px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}><Download size={16} /> Download Filtered Bill</button>
          </div>

          <h3 style={{ margin: '0 0 4px 0', fontSize: '24px', fontWeight: '900', color: '#0f172a' }}>Statement Audit: <span style={{ color: '#0284c7' }}>{t('names.' + auditMeta.name, auditMeta.name)}</span></h3>
          <p style={{ margin: '0 0 28px 0', fontSize: '13.5px', color: '#64748b', fontWeight: '500' }}>Change dates below to filter data. The PDF bill will strictly match your selection.</p>

          {/* 🟢 NEW CUSTOM RATE OVERRIDE INPUT */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
            <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px' }}>START DATE (BILL FROM)</label><input type="date" value={auditStartDate} onChange={e => setAuditStartDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a' }} /></div>
            <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', marginBottom: '6px' }}>END DATE (BILL TO)</label><input type="date" value={auditEndDate} onChange={e => setAuditEndDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '1px solid #cbd5e1', fontWeight: '700', color: '#0f172a' }} /></div>
            <div><label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#0284c7', marginBottom: '6px' }}>CUSTOM RATE OVERRIDE (₹/CAN)</label><input type="number" placeholder="Leave empty for default" value={customAuditRate} onChange={e => setCustomAuditRate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '10px', border: '2px dashed #bae6fd', fontWeight: '700', color: '#0284c7' }} /></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '16px 20px', borderRadius: '16px' }}><div style={{ fontSize: '11px', fontWeight: '800', color: '#166534' }}>NET QUANTITY DELIVERED</div><div style={{ fontSize: '24px', fontWeight: '900', color: '#14532d', marginTop: '6px' }}>{auditCansSum.toFixed(1)} Cans</div></div>
            <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', padding: '16px 20px', borderRadius: '16px' }}><div style={{ fontSize: '11px', fontWeight: '800', color: '#0369a1' }}>VOLUME OUTPUT LOGGED</div><div style={{ fontSize: '24px', fontWeight: '900', color: '#0c4a6e', marginTop: '6px' }}>{auditLitersSum.toLocaleString()} L</div></div>
            
            {/* 🟢 NEW DYNAMIC BILLING CARD */}
            <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', padding: '16px 20px', borderRadius: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', color: '#c2410c' }}>FILTERED BILLING AMOUNT</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#7c2d12', marginTop: '6px' }}>
                ₹{(customAuditRate ? (auditCansSum * parseFloat(customAuditRate)) : auditRevenueSum).toLocaleString()}.00
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #cbd5e1', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#475569' }}>
                  <th style={{ padding: '14px 20px' }}>Date & Time</th>
                  <th style={{ padding: '14px 20px' }}>{auditMeta.type === 'driver' ? 'Client Destination' : 'Fleet Driver'}</th>
                  <th style={{ padding: '14px 24px' }}>Shift Cycle</th>
                  <th style={{ padding: '14px 20px' }}>Volume Supplied</th>
                  {/* 🟢 ACTION HEADER */}
                  <th style={{ padding: '14px 20px' }}>Action</th>
                </tr>
              </thead>
              <tbody style={{ color: '#334155', fontWeight: '600' }}>
                {auditLedgerRecords.length === 0 ? (
                  <tr><td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>No delivery details found between {formatDateToDDMMYYYY(auditStartDate)} and {formatDateToDDMMYYYY(auditEndDate)}.</td></tr>
                ) : (
                  auditLedgerRecords.map(log => {
                    const d = new Date(log.created_at);
                    const displayDate = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                    const cVol = parseFloat(log.cans_delivered) || 0;
                    const compObject = log.companies || {};
                    const driverObject = log.drivers || {};
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 20px', fontFamily: 'monospace', color: '#0284c7' }}>{displayDate} — {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                        <td style={{ padding: '12px 20px', fontWeight: '800' }}>{auditMeta.type === 'driver' ? `🏢 ${t('names.' + compObject?.name, compObject?.name)}` : `👤 ${t('names.' + driverObject?.name, driverObject?.name)}`}</td>
                        <td style={{ padding: '12px 20px' }}><span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', backgroundColor: log.shift === 'Morning' ? '#fff7ed' : '#f0fdf4', color: log.shift === 'Morning' ? '#c2410c' : '#15803d' }}>{log.shift}</span></td>
                        <td style={{ padding: '12px 20px', fontWeight: '800', color: '#0f172a' }}>{cVol.toFixed(1)} Cans <span style={{ opacity: 0.5, fontSize: '11px' }}>({(cVol * 20).toFixed(0)} L)</span></td>
                        
                        {/* 🟢 DELETE BUTTON INSIDE TABLE */}
                        <td style={{ padding: '12px 20px' }}>
                          <button onClick={() => handleRemoveDeliveryLog(log.id)} style={{ padding: '6px 12px', border: '1px solid #fecdd3', borderRadius: '8px', backgroundColor: '#fff5f5', color: '#e11d48', fontSize: '11px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 📋 SUB-VIEW PORTAL B: THE PRIMARY MONITOR DASHBOARD */
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '40px' }}>
            <div style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', color: '#ffffff', padding: '24px', borderRadius: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', opacity: 0.9 }}>{viewMode.toUpperCase()} DISPATCH</div>
              <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '12px' }}>{stats[viewMode]?.v.toLocaleString() || 0} <span style={{ fontSize: '14px', fontWeight: '500' }}>{t('liters')}</span></div>
              <div style={{ fontSize: '16px', fontWeight: '700', marginTop: '4px' }}>₹{stats[viewMode]?.e.toLocaleString() || 0}.00</div>
            </div>
            <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '24px', borderRadius: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', opacity: 0.9 }}>CURRENT CYCLE INCOME</div>
              <div style={{ fontSize: '28px', fontWeight: '900', marginTop: '12px' }}>₹{financialSummary.paid.toLocaleString()} <span style={{ fontSize: '14px', fontWeight: '500' }}>Paid</span></div>
              <div style={{ fontSize: '15px', fontWeight: '700', marginTop: '4px', opacity: 0.95 }}>₹{financialSummary.pending.toLocaleString()} Outstanding Balance</div>
            </div>
            
            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '24px', borderRadius: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d' }}>ACTIVE MONTH START LOCK ANCHOR</div>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#166534', marginTop: '6px' }}>Cycle Active Since: {formatDateToDDMMYYYY(cycleStartDate)}</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
                <button onClick={handleResetBillingCycle} style={{ padding: '10px', border: 'none', borderRadius: '12px', backgroundColor: '#166534', color: '#ffffff', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><RefreshCw size={12} /> New Cycle</button>
                <button onClick={handleResetAllPayments} style={{ padding: '10px', border: '1px solid #a3cfbb', borderRadius: '12px', backgroundColor: '#ffffff', color: '#15803d', fontSize: '11px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}><RotateCcw size={12} /> Reset Paid</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '30px' }}>
            {[ { label: 'Today', key: 'daily', v: stats.daily }, { label: 'Weekly', key: 'weekly', v: stats.weekly }, { label: 'Monthly', key: 'monthly', v: stats.monthly } ].map(item => (
              <button key={item.key} onClick={() => setViewMode(item.key)} style={{ padding: '20px', flex: 1, borderRadius: '15px', background: viewMode === item.key ? '#0284c7' : '#f1f5f9', color: viewMode === item.key ? '#ffffff' : '#0f172a', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '800' }}>
                {item.label}: {item.v.v} L / Rs.{item.v.e}
              </button>
            ))}
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div style={{ padding: '24px', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Active Billing Cycle Accounts Collection Balance Sheet</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Click any client's name link to access their **Separate Analysis 3-Month Statement View**.</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}><th style={{ padding: '14px 20px' }}>Corporate Client Name</th><th style={{ padding: '14px 20px' }}>Cans Dispatched</th><th style={{ padding: '14px 20px' }}>Liters Supplied</th><th style={{ padding: '14px 20px' }}>Statement Balance</th><th style={{ padding: '14px 20px' }}>Invoice Settle Actions</th></tr></thead>
              <tbody style={{ color: '#334155', fontWeight: '600' }}>
                {monthlyCompanyReport.length > 0 ? monthlyCompanyReport.map((company, idx) => {
                  const isOverdue = new Date().getDate() >= 6 && !company.is_paid && company.billing > 0;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isOverdue ? '#fff5f5' : 'transparent' }}>
                      <td onClick={() => launchDeepAuditPanel('company', company.id, company.name)} style={{ padding: '14px 20px', fontWeight: '800', color: isOverdue ? '#b91c1c' : '#0284c7', cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {t('names.' + company.name, company.name)}</td>
                      <td style={{ padding: '14px 20px' }}>{company.cans.toFixed(1)} Cans</td>
                      <td style={{ padding: '14px 20px' }}>{company.liters.toFixed(0)} L</td>
                      <td style={{ padding: '14px 20px', fontWeight: '900', color: company.is_paid ? '#059669' : '#b91c1c', fontSize: '15px' }}>₹{company.billing.toLocaleString()}.00</td>
                      <td style={{ padding: '14px 20px' }}>
                        <div onClick={() => toggleCompanyPaymentStatus(company.id, company.is_paid)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: company.is_paid ? '#e6f4ea' : '#fce8e6', padding: '6px 12px', borderRadius: '10px', border: `1px solid ${company.is_paid ? '#a3cfbb' : '#f1aeb5'}` }}>
                          {company.is_paid ? <CheckSquare size={15} style={{ color: '#146c43' }} /> : <Square size={15} style={{ color: '#b02a37' }} />}
                          <span style={{ fontSize: '12px', fontWeight: '800', color: company.is_paid ? '#146c43' : '#b02a37' }}>{company.is_paid ? 'Settled' : 'Mark Paid'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No clients found.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden', marginBottom: '40px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.01)' }}>
            <div style={{ padding: '24px', backgroundColor: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Active Billing Cycle Driver Fleet Performance Spreadsheet</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Click any driver's name link to access their **Separate Analysis 3-Month Trip Records**.</p>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}><th style={{ padding: '14px 20px' }}>Fleet Driver Name</th><th style={{ padding: '14px 20px' }}>Total Completed Trip Routes</th><th style={{ padding: '14px 20px' }}>Net Operational Summary Dispatched</th></tr></thead>
              <tbody style={{ color: '#334155', fontWeight: '600' }}>
                {monthlyDriverReport.length > 0 ? monthlyDriverReport.map((driver, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td onClick={() => launchDeepAuditPanel('driver', driver.id, driver.name)} style={{ padding: '14px 20px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {t('names.' + driver.name, driver.name)}</td>
                    <td style={{ padding: '14px 20px' }}><span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: '6px' }}>{driver.trips} Trips Run</span></td>
                    <td style={{ padding: '14px 20px' }}>
                      <div>{driver.cans.toFixed(1)} Cans Delivered <span style={{ opacity: 0.6, fontSize: '12px' }}>({(driver.cans * 20).toFixed(0)} L)</span></div>
                      <div style={{ color: '#10b981', fontSize: '12px', marginTop: '2px' }}>Payout Owed: ₹{(driver.cans * 15).toLocaleString()}.00</div>
                    </td>
                  </tr>
                )) : <tr><td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No drivers found.</td></tr>}
              </tbody>
            </table>
          </div>

          <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '24px', padding: '24px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><Calendar style={{ color: '#0284c7' }} /><div style={{ fontSize: '14px', fontWeight: '800' }}>Target Single Day Ledger Analysis View</div></div>
            <input type="date" value={selectedFilterDate} onChange={e => setSelectedFilterDate(e.target.value)} style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid #0ea5e9', fontWeight: '700', color: '#0369a1' }} />
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden', marginBottom: '40px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc' }}><th style={{ padding: '14px 20px' }}>{t('thCompany')} ({formatDateToDDMMYYYY(selectedFilterDate)})</th><th style={{ padding: '14px 20px' }}>{t('thCans')}</th><th style={{ padding: '14px 20px' }}>{t('thVolume')}</th><th style={{ padding: '14px 20px' }}>{t('thBalance')}</th><th style={{ padding: '14px 20px' }}>{t('thActions')}</th></tr></thead>
              <tbody>
                {dayFilteredAnalytics.length === 0 ? (<tr><td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>No daily deliveries found matching this filtered date parameter.</td></tr>) : dayFilteredAnalytics.map((company, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '14px 20px', fontWeight: '800' }}>{t('names.' + company.name, company.name)}</td><td style={{ padding: '14px 20px' }}>{company.cans.toFixed(1)} Cans</td><td style={{ padding: '14px 20px' }}>{company.liters.toFixed(0)} L</td><td style={{ padding: '14px 20px', fontWeight: '900', color: '#059669' }}>₹{company.billing}.00</td><td style={{ padding: '14px 20px' }}><button onClick={() => generateInvoicePDF(company)} style={{ padding: '6px 12px', border: '1px solid #bae6fd', borderRadius: '8px', backgroundColor: '#f0f9ff', color: '#0284c7', cursor: 'pointer', fontWeight: '700' }}><FileText size={12} /> {t('downloadBill')}</button></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '32px', marginBottom: '40px' }}>
            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '28px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800' }}>{t('addDriverTitle')}</h4>
              <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}><input type="text" value={newDriverName} onChange={e => setNewDriverName(e.target.value)} placeholder={t('driverPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }} /><button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#0f172a', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>{t('addBtn')}</button></form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                {driversList.map(d => (<div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}><span style={{ fontSize: '13px', fontWeight: '700' }}>👤 {t('names.' + d.name, d.name)}</span><Trash2 size={15} onClick={() => handleRemoveDriver(d.id, d.name)} style={{ color: '#ef4444', cursor: 'pointer' }} /></div>))}
              </div>
            </div>

            <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', padding: '28px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '800' }}>{t('addCompanyTitle')}</h4>
              <form onSubmit={handleAddCompany} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}><input type="text" value={newCompanyName} onChange={e => setNewCompanyName(e.target.value)} placeholder={t('companyPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }} /><input type="number" value={newCompanyRate} onChange={e => setNewCompanyRate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', outline: 'none' }} /><button type="submit" style={{ width: '100%', padding: '14px', borderRadius: '12px', backgroundColor: '#0284c7', color: '#ffffff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>{t('saveBtn')}</button></form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                {companiesList.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '10px' }}>
                    {editingCompanyId === c.id ? (
                      <div style={{ display: 'flex', gap: '6px', width: '100%' }}>
                        <input type="text" value={updatedCompanyName} onChange={e => setUpdatedCompanyName(e.target.value)} style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #0ea5e9', fontSize: '12px', fontWeight: '700' }} />
                        <button onClick={() => handleSaveCompanyNewName(c.id)} style={{ padding: '4px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '6px', cursor: 'pointer' }}><Save size={12} /></button>
                        <button onClick={() => setEditingCompanyId(null)} style={{ padding: '4px', border: 'none', backgroundColor: '#64748b', color: '#ffffff', borderRadius: '6px', cursor: 'pointer' }}><X size={12} /></button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '4px' }}>🏢 {t('names.' + c.name, c.name)} (₹{c.rate_per_can})</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Edit3 size={14} onClick={() => { setEditingCompanyId(c.id); setUpdatedCompanyName(c.name); }} style={{ color: '#0ea5e9', cursor: 'pointer' }} />
                          <Trash2 size={15} onClick={() => handleRemoveCompany(c.id, c.name)} style={{ color: '#ef4444', cursor: 'pointer' }} />
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '24px', overflow: 'hidden' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#fafafa', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800' }}>Live Verification History Logs</h3>
              <button onClick={generateCumulativeSummaryInvoice} style={{ padding: '8px 16px', borderRadius: '12px', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '700', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Download size={14} /> Download {viewMode} Report</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}><th style={{ padding: '14px 24px' }}>Timestamp Specification</th><th style={{ padding: '14px 24px' }}>Fleet Driver</th><th style={{ padding: '14px 24px' }}>Client Destination Facility</th><th style={{ padding: '14px 24px' }}>Shift</th><th style={{ padding: '14px 24px' }}>Cans Poured</th><th style={{ padding: '14px 24px' }}>Admin Action</th></tr></thead>
              <tbody>
                {getFilteredLogs().length === 0 ? (
                  <tr><td colSpan="6" style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontWeight: '600' }}>No deliveries found for the selected view mode.</td></tr>
                ) : getFilteredLogs().map((delivery) => {
                  const timestamp = new Date(delivery.created_at); const isEditable = (new Date() - timestamp) <= 24 * 60 * 60 * 1000;
                  const dName = delivery.drivers ? delivery.drivers.name : 'Unknown'; const cName = delivery.companies ? delivery.companies.name : 'Unknown';
                  const cVol = parseFloat(delivery.cans_delivered) || 0;
                  const displayDate = `${String(timestamp.getDate()).padStart(2, '0')}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${timestamp.getFullYear()}`;
                  return (
                    <tr key={delivery.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '14px 24px', color: '#0284c7', fontFamily: 'monospace' }}>{displayDate} — {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                      <td style={{ padding: '14px 24px', fontWeight: '800' }}>{t('names.' + dName, dName)}</td>
                      <td style={{ padding: '14px 24px' }}>🏢 {t('names.' + cName, cName)}</td>
                      <td style={{ padding: '14px 24px' }}>{delivery.shift}</td>
                      <td style={{ padding: '14px 24px' }}>{editingDeliveryId === delivery.id ? (<input type="number" step="any" value={updatedCansValue} onChange={e => setUpdatedCansValue(e.target.value)} style={{ width: '60px', padding: '4px', border: '2px solid #0ea5e9', borderRadius: '6px', fontWeight: '800' }} />) : (<span style={{ fontWeight: '800' }}>{cVol.toFixed(1)} Cans <span style={{ opacity: 0.5, fontSize: '11px', fontWeight: '500' }}>({(cVol * 20).toFixed(0)} L)</span></span>)}</td>
                      
                      <td style={{ padding: '14px 24px' }}>
                        {editingDeliveryId === delivery.id ? (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => handleSaveUpdatedCans(delivery.id)} style={{ padding: '4px 8px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Save size={12} /></button>
                            <button onClick={() => setEditingDeliveryId(null)} style={{ padding: '4px 8px', backgroundColor: '#64748b', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}><X size={12} /></button>
                          </div>
                        ) : isEditable ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button onClick={() => { setEditingDeliveryId(delivery.id); setUpdatedCansValue(delivery.cans_delivered); }} style={{ padding: '6px 12px', border: '1px solid #bae6fd', borderRadius: '8px', backgroundColor: '#f0f9ff', color: '#0284c7', fontSize: '11px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><Edit3 size={12} /> Edit</button>
                            <button onClick={() => handleRemoveDeliveryLog(delivery.id)} style={{ padding: '6px 12px', border: '1px solid #fecdd3', borderRadius: '8px', backgroundColor: '#fff5f5', color: '#e11d48', fontSize: '11px', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}><Trash2 size={12} /> Delete</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' }}>Locked</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}