import React, { useState, useEffect } from 'react';
import i18n from './i18n/config';
import { useTranslation } from 'react-i18next';
import DriverPortal from './components/DriverPortal';
import AdminPortal from './components/AdminPortal';
import { Globe, Shield, Droplet, ArrowRight, ShieldCheck, Award, Zap, KeyRound, Lock, Mail } from 'lucide-react';

export default function App() {
  const { t } = useTranslation();
  const [view, setView] = useState('home'); 
  
  // Dynamic Admin Profile Configuration Hooks
  const [adminEmail, setAdminEmail] = useState(() => localStorage.getItem('cfg_adm_mail') || 'admin@water.com');
  const [adminPass, setAdminPass] = useState(() => localStorage.getItem('cfg_adm_key') || 'plant2026');
  
  // Standard Login Inputs States
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  // 🚀 Forgot Password Override Recover States
  const [recoveryPasskeyInput, setRecoveryPasskeyInput] = useState('');
  const [newRecoveredEmail, setNewRecoveredEmail] = useState('');
  const [newRecoveredPassword, setNewRecoveredPassword] = useState('');
  const [isPasskeyVerified, setIsPasskeyVerified] = useState(false);

  // Auto-sync credential configurations whenever local storage layers change values
  useEffect(() => {
    const syncProfileKeys = () => {
      setAdminEmail(localStorage.getItem('cfg_adm_mail') || 'admin@water.com');
      setAdminPass(localStorage.getItem('cfg_adm_key') || 'plant2026');
    };
    window.addEventListener('storage', syncProfileKeys);
    return () => window.removeEventListener('storage', syncProfileKeys);
  }, []);

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (emailInput === adminEmail && passwordInput === adminPass) {
      setIsAdminAuthenticated(true);
      setView('admin_dashboard');
    } else {
      alert("Invalid Security Keys Provided!");
    }
  };

  // 🚀 MASTER RECOVERY PROTOCOL VERIFIER
  const handleVerifyMasterPasskey = (e) => {
    e.preventDefault();
    if (recoveryPasskeyInput === "6789012345") {
      setIsPasskeyVerified(true);
    } else {
      alert("Invalid Master Recovery Passkey! Access Denied.");
    }
  };

  const handleApplyEmergencyReset = (e) => {
    e.preventDefault();
    if (!newRecoveredEmail.trim() || !newRecoveredPassword.trim()) {
      alert("Please fill out both email and password fields.");
      return;
    }

    // Overwrite baseline system settings profiles securely
    localStorage.setItem('cfg_adm_mail', newRecoveredEmail.trim());
    localStorage.setItem('cfg_adm_key', newRecoveredPassword.trim());
    
    setAdminEmail(newRecoveredEmail.trim());
    setAdminPass(newRecoveredPassword.trim());
    
    alert("Administrative Credentials Updated Successfully! Please sign-in now.");
    
    // Clear state inputs arrays and route back to login box
    setRecoveryPasskeyInput('');
    setNewRecoveredEmail('');
    setNewRecoveredPassword('');
    setIsPasskeyVerified(false);
    setView('admin_login');
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#1e293b', fontFamily: 'system-ui, -apple-system, sans-serif', margin: 0, paddingBottom: '100px', position: 'relative', overflowX: 'hidden' }}>
      
      {/* 🌊 CSS Premium Fluid Water Animation Backdrop Layer */}
      <style>{`
        @keyframes liquidMove {
          0% { transform: translate(-50%, -0%) rotate(0deg); }
          50% { transform: translate(-50%, -2%) rotate(180deg); }
          100% { transform: translate(-50%, -0%) rotate(360deg); }
        }
        .water-wave-layer {
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 250vw;
          height: 250vw;
          background-color: rgba(14, 165, 233, 0.04);
          border-radius: 43%;
          animation: liquidMove 14s linear infinite;
          pointer-events: none;
          z-index: 1;
        }
        .water-wave-top {
          background-color: rgba(2, 132, 199, 0.03);
          animation-duration: 18s;
          border-radius: 40%;
        }
      `}</style>
      
      <div className="water-wave-layer"></div>
      <div className="water-wave-layer water-wave-top"></div>

      {/* Premium Navigation Header Navbar */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 24px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div onClick={() => setView('home')} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <div style={{ backgroundColor: '#0284c7', color: '#ffffff', padding: '10px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Droplet size={24} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#0369a1', letterSpacing: '-0.5px' }}>RO WAATER</h1>
              <p style={{ margin: 0, fontSize: '9px', color: '#0ea5e9', fontWeight: '700', letterSpacing: '1.5px' }}>{t('purityGuaranteed')}</p>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '28px', alignItems: 'center', zIndex: 10 }}>
            <span onClick={() => setView('home')} style={{ fontSize: '14px', fontWeight: '800', color: view === 'home' ? '#0284c7' : '#64748b', cursor: 'pointer' }}>{t('home')}</span>
            <span onClick={() => setView('driver_portal')} style={{ fontSize: '14px', fontWeight: '800', color: view === 'driver_portal' ? '#0284c7' : '#64748b', cursor: 'pointer' }}>{t('driverPortalTab')}</span>
            <span onClick={() => setView('admin_login')} style={{ fontSize: '14px', fontWeight: '800', color: view === 'admin_login' || view === 'admin_dashboard' ? '#0284c7' : '#64748b', cursor: 'pointer' }}>{t('adminPanelTab')}</span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 10 }}>
            <div style={{ backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'flex', alignItems: 'center', border: '1px solid #e2e8f0' }}>
              <Globe size={14} style={{ color: '#94a3b8', marginLeft: '6px', marginRight: '4px' }} />
              <button onClick={() => i18n.changeLanguage('en')} style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: i18n.language === 'en' ? '#ffffff' : 'transparent', color: i18n.language === 'en' ? '#0284c7' : '#64748b' }}>EN</button>
              <button onClick={() => i18n.changeLanguage('te')} style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: i18n.language === 'te' ? '#ffffff' : 'transparent', color: i18n.language === 'te' ? '#0284c7' : '#64748b' }}>తెలుగు</button>
              <button onClick={() => i18n.changeLanguage('hi')} style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', border: 'none', borderRadius: '6px', cursor: 'pointer', backgroundColor: i18n.language === 'hi' ? '#ffffff' : 'transparent', color: i18n.language === 'hi' ? '#0284c7' : '#64748b' }}>हिंदी</button>
            </div>
          </div>

        </div>
      </header>

      {/* VIEW 1: MASTER LANDING PLATFORM HOMEPAGE CONTAINER */}
      {view === 'home' && (
        <div style={{ position: 'relative', zIndex: 5 }}>
          <section style={{ padding: '90px 24px 60px 24px', textAlign: 'center' }}>
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
              <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '30px', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase' }}>💧 Commercial Dispatch Logistics Platform</span>
              <h2 style={{ fontSize: '46px', fontWeight: '900', color: '#0f172a', margin: '24px 0 16px 0', lineHeight: '1.2' }}>{t('heroTitle')}</h2>
              <p style={{ fontSize: '15px', color: '#475569', maxWidth: '650px', margin: '0 auto 36px auto', lineHeight: '1.6', fontWeight: '500' }}>{t('heroSubtitle')}</p>
              
              <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button onClick={() => setView('driver_portal')} style={{ backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '800', padding: '18px 36px', borderRadius: '16px', border: 'none', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 20px -3px rgba(2,132,199,0.3)', textTransform: 'capitalize' }}>{t('driverPortalTab')}</button>
                <button onClick={() => setView('admin_login')} style={{ backgroundColor: '#ffffff', color: '#0f172a', fontWeight: '800', padding: '18px 36px', borderRadius: '16px', border: '1px solid #cbd5e1', fontSize: '14px', cursor: 'pointer' }}>{t('adminPanelTab')}</button>
              </div>
            </div>
          </section>

          <section style={{ maxWidth: '1200px', margin: '30px auto 0 auto', padding: '0 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '28px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '24px' }}>
                <div style={{ color: '#0284c7', marginBottom: '16px' }}><ShieldCheck size={32} /></div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t('stageTitle')}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>{t('stageDesc')}</p>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '24px' }}>
                <div style={{ color: '#0284c7', marginBottom: '16px' }}><Award size={32} /></div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t('mineralTitle')}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>{t('mineralDesc')}</p>
              </div>
              <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '32px', borderRadius: '24px' }}>
                <div style={{ color: '#0284c7', marginBottom: '16px' }}><Zap size={32} /></div>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{t('deliveryTitle')}</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>{t('deliveryDesc')}</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: DRIVER INTAKE COMPONENT LOG FEED FRAME */}
      {view === 'driver_portal' && (
        <div style={{ maxWidth: '460px', margin: '50px auto 0 auto', padding: '0 16px', position: 'relative', zIndex: 10 }}>
          <div style={{ backgroundColor: '#ffffff', padding: '12px', borderRadius: '28px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0' }}>
            <DriverPortal />
          </div>
        </div>
      )}

      {/* VIEW 3: ADMINISTRATIVE VERIFICATION FIELD WINDOW CONTAINER */}
      {view === 'admin_login' && (
        <div style={{ maxWidth: '400px', margin: '70px auto 0 auto', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.06)', border: '1px solid #bae6fd', position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#f0f9ff', color: '#0ea5e9', padding: '12px', borderRadius: '16px', border: '1px solid #bae6fd' }}><Shield size={22} /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Management Log-In</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Authentication keys requested to inspect financial balances.</p>
            </div>
          </div>
          
          <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>EMAIL IDENTITY</label>
              <input type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }} placeholder="admin@water.com" required />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#64748b', marginBottom: '6px' }}>PASSKEY</label>
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none' }} placeholder="••••••••" required />
            </div>
            
            {/* 🚀 NEW LINK: Forgot Password Link Element Trigger */}
            <div style={{ textAlign: 'right', marginTop: '-4px' }}>
              <span 
                onClick={() => setView('forgot_password')} 
                style={{ fontSize: '11px', fontWeight: '800', color: '#0284c7', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Forgot Password?
              </span>
            </div>

            <button type="submit" style={{ width: '100%', backgroundColor: '#0284c7', color: '#ffffff', fontWeight: '700', padding: '14px', borderRadius: '12px', border: 'none', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>Unlock Dashboard <ArrowRight size={14} /></button>
          </form>
        </div>
      )}

      {/* 🚀 VIEW 3.5: NEW SECURITY FORGOT PASSWORD OVERRIDE RECOVERY LAYER */}
      {view === 'forgot_password' && (
        <div style={{ maxWidth: '420px', margin: '70px auto 0 auto', backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.06)', border: '2px solid #ef4444', position: 'relative', zIndex: 10 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ backgroundColor: '#fef2f2', color: '#ef4444', padding: '12px', borderRadius: '16px', border: '1px solid #fee2e2' }}><KeyRound size={22} /></div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>Emergency Credentials Reset</h3>
              <p style={{ margin: 0, fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Enter the 10-digit Master override passkey token to change login routes.</p>
            </div>
          </div>

          {!isPasskeyVerified ? (
            /* Phase 1: Requesting Override Token Key Entry */
            <form onSubmit={handleVerifyMasterPasskey} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}>MASTER SECURITY RECOVERY PASSKEY</label>
                <input 
                  type="password" 
                  value={recoveryPasskeyInput}
                  onChange={e => setRecoveryPasskeyInput(e.target.value)}
                  placeholder="Enter 10-digit key..." 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', fontWeight: '800', letterSpacing: '2px', outline: 'none' }} 
                  required 
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                <button type="button" onClick={() => setView('admin_login')} style={{ flex: 1, padding: '12px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: '12px', border: 'none', backgroundColor: '#ef4444', color: '#ffffff', borderRadius: '12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>Verify Token</button>
              </div>
            </form>
          ) : (
            /* Phase 2: Unlocked! Requesting New Email ID & Password Configurations */
            <form onSubmit={handleApplyEmergencyReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderRadius: '10px', border: '1px solid #bbf7d0', fontSize: '12px', fontWeight: '700', color: '#15803d', marginBottom: '4px' }}>
                ✓ Token Authorized. Define your new master profile credentials below:
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}><Mail size={12} /> NEW ADMINISTRATIVE EMAIL ID</label>
                <input 
                  type="email" 
                  value={newRecoveredEmail}
                  onChange={e => setNewRecoveredEmail(e.target.value)}
                  placeholder="e.g. lokesh@water.com" 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none', fontWeight: '700' }} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: '700', color: '#475569', marginBottom: '6px' }}><Lock size={12} /> NEW MASTER PASSWORD</label>
                <input 
                  type="text" 
                  value={newRecoveredPassword}
                  onChange={e => setNewRecoveredPassword(e.target.value)}
                  placeholder="Set strong passkey..." 
                  style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '13px', outline: 'none', fontWeight: '700' }} 
                  required 
                />
              </div>
              <button type="submit" style={{ width: '100%', padding: '14px', border: 'none', backgroundColor: '#10b981', color: '#ffffff', borderRadius: '12px', fontSize: '12px', fontWeight: '800', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', marginTop: '4px' }}>
                Save & Apply Credentials Override
              </button>
            </form>
          )}

        </div>
      )}

      {/* VIEW 4: MASTER COMPREHENSIVE RECONCILIATION DATA ENGINE PANEL */}
      {view === 'admin_dashboard' && (
        <div style={{ maxWidth: '1200px', margin: '40px auto 0 auto', padding: '0 24px', position: 'relative', zIndex: 10 }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '24px', border: '1px solid #e2e8f0' }}>
            <AdminPortal />
          </div>
        </div>
      )}

    </div>
  );
}