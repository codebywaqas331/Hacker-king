import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LicenseDetails, SignalItem, AppConfig } from '../types.ts';
import { saveSignalToFirestore, fetchSignalsFromFirestore, saveLicenseToFirestore } from '../services/firebaseDb.ts';

const BUILT_IN_KEYS_SYNC: LicenseDetails[] = [
  {
    id: 'lic_king_crown_001',
    license_key: 'FRK-VIP-LIFETIME-KING',
    full_name: 'Waqas King (VIP Master)',
    phone: '+966554573612',
    email: 'codewithwaqas.dev@gmail.com',
    amount: 'VIP Crown Sponsor',
    status: 'approved',
    duration_label: 'Lifetime',
    expires_at: null,
    lifetime: true,
    max_devices: 10,
    license_devices: [],
  },
  {
    id: 'lic_master_001',
    license_key: 'FRK-PRO-MASTER-KEY-2026',
    full_name: 'VIP Master Admin',
    phone: '+966554573612',
    email: 'emailwaqas7@gmail.com',
    amount: 'VIP Master Key',
    status: 'approved',
    duration_label: 'Lifetime',
    expires_at: null,
    lifetime: true,
    max_devices: 10,
    license_devices: [],
  },
  {
    id: 'lic_1year_crown_8820',
    license_key: 'FRK-CROWN-1YEAR-8820',
    full_name: 'Elite Crown Trader',
    phone: '+966554573612',
    email: 'client@frkings.pro',
    amount: '350 USD',
    status: 'approved',
    duration_label: '1 Year',
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 5,
    license_devices: [],
  },
  {
    id: 'lic_elite_6m_5531',
    license_key: 'FRK-ELITE-6M-5531',
    full_name: 'Sultan Elite Pro',
    phone: '+966554573612',
    email: 'sultan.trader@gmail.com',
    amount: '180 USD',
    status: 'approved',
    duration_label: '6 Months',
    expires_at: new Date(Date.now() + 180 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 3,
    license_devices: [],
  },
  {
    id: 'lic_pro_3m_4419',
    license_key: 'FRK-PRO-3M-4419',
    full_name: 'Waqas Pro Trader',
    phone: '+966554573612',
    email: 'codewithwaqas.dev@gmail.com',
    amount: '100 USD',
    status: 'approved',
    duration_label: '3 Months',
    expires_at: new Date(Date.now() + 90 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 3,
    license_devices: [],
  },
  {
    id: 'lic_gold_1m_7720',
    license_key: 'FRK-GOLD-1M-7720',
    full_name: 'Quotex Gold Trader',
    phone: '+966554573612',
    email: 'gold.trader@gmail.com',
    amount: '50 USD',
    status: 'approved',
    duration_label: '1 Month',
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 2,
    license_devices: [],
  },
  {
    id: 'lic_alpha_1m_9932',
    license_key: 'FRK-ALPHA-1M-9932',
    full_name: 'Alpha Scalper Max',
    phone: '+966554573612',
    email: 'alpha.scalper@gmail.com',
    amount: '50 USD',
    status: 'approved',
    duration_label: '1 Month',
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 2,
    license_devices: [],
  },
  {
    id: 'lic_trial_3days_01',
    license_key: 'FRK-TRIAL-3DAYS-01',
    full_name: 'VIP 3-Day Trial User',
    phone: '+966554573612',
    email: 'trial.user@gmail.com',
    amount: 'Free Trial',
    status: 'approved',
    duration_label: '3 Days',
    expires_at: new Date(Date.now() + 3 * 86400000).toISOString(),
    lifetime: false,
    max_devices: 1,
    license_devices: [],
  },
];

interface BotContextType {
  currentRoute: string;
  navigateTo: (route: string) => void;
  activeLicense: string | null;
  licenseDetails: LicenseDetails | null;
  deviceId: string;
  signals: SignalItem[];
  addSignal: (signal: SignalItem) => void;
  clearSignals: () => void;
  activateKey: (key: string, details?: LicenseDetails) => void;
  deactivateKey: () => void;
  appConfig: AppConfig | null;
  refreshConfig: () => Promise<void>;
  isAuthSettingsOpen: boolean;
  setAuthSettingsOpen: (open: boolean) => void;
  isVerifying: boolean;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
}

const BotContext = createContext<BotContextType | null>(null);

export const BotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => !!sessionStorage.getItem('frk_admin'));
  const [activeLicense, setActiveLicense] = useState<string | null>(
    () => localStorage.getItem('frk_license')
  );
  const [licenseDetails, setLicenseDetails] = useState<LicenseDetails | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(
    () => !!localStorage.getItem('frk_license')
  );

  const [deviceId] = useState<string>(() => {
    let saved = localStorage.getItem('frk_device');
    if (!saved) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        saved = crypto.randomUUID();
      } else {
        saved = 'dev-' + Math.random().toString(36).substring(2, 12);
      }
      localStorage.setItem('frk_device', saved);
    }
    return saved;
  });

  const [signals, setSignals] = useState<SignalItem[]>(() => {
    try {
      const stored = localStorage.getItem('frk_signals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [isAuthSettingsOpen, setAuthSettingsOpen] = useState<boolean>(false);

  const refreshConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        setAppConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch config:', err);
    }
  };

  useEffect(() => {
    refreshConfig();

    // Background sync pre-built VIP keys to Firestore cloud database
    BUILT_IN_KEYS_SYNC.forEach((lic) => {
      saveLicenseToFirestore(lic).catch(() => {});
    });

    // Fetch persisted signals from server
    fetch('/api/signals')
      .then((res) => res.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.signals) && data.signals.length > 0) {
          setSignals((prev) => {
            const existingIds = new Set(prev.map((s) => s.id));
            const newOnes = data.signals.filter((s: SignalItem) => !existingIds.has(s.id));
            const combined = [...prev, ...newOnes].slice(0, 50);
            localStorage.setItem('frk_signals', JSON.stringify(combined));
            return combined;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Check active license on startup
  useEffect(() => {
    const savedKey = localStorage.getItem('frk_license');
    if (savedKey) {
      setIsVerifying(true);
      fetch('/api/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: savedKey, device: deviceId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok && data.license) {
            setActiveLicense(savedKey);
            setLicenseDetails(data.license);
            if (currentRoute === '/') {
              navigateTo('/dashboard');
            }
          } else {
            console.warn('License verification failed:', data.error);
            localStorage.removeItem('frk_license');
            setActiveLicense(null);
            setLicenseDetails(null);
            if (currentRoute !== '/' && currentRoute !== '/admin') {
              navigateTo('/');
            }
          }
        })
        .catch(() => {
          const matched = BUILT_IN_KEYS_SYNC.find(
            (b) => b.license_key.toUpperCase() === savedKey.toUpperCase()
          );
          if (matched) {
            setActiveLicense(savedKey);
            setLicenseDetails(matched);
          } else {
            setActiveLicense(savedKey);
          }
        })
        .finally(() => {
          setIsVerifying(false);
        });
    } else {
      setIsVerifying(false);
    }
  }, [deviceId]);

  const navigateTo = (route: string) => {
    queueMicrotask(() => {
      setCurrentRoute(route);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const addSignal = (sig: SignalItem) => {
    setSignals((prev) => {
      const updated = [sig, ...prev].slice(0, 50);
      try {
        localStorage.setItem('frk_signals', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Also persist to server database & Firebase Firestore
    saveSignalToFirestore(sig).catch(() => {});
    fetch('/api/signals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signal: sig }),
    }).catch(() => {});
  };

  const clearSignals = () => {
    setSignals([]);
    try {
      localStorage.removeItem('frk_signals');
    } catch {}
  };

  const activateKey = (key: string, details?: LicenseDetails) => {
    const clean = key.trim().toUpperCase();
    localStorage.setItem('frk_license', clean);
    setActiveLicense(clean);
    if (details) setLicenseDetails(details);
    navigateTo('/dashboard');
  };

  const deactivateKey = () => {
    localStorage.removeItem('frk_license');
    setActiveLicense(null);
    setLicenseDetails(null);
    navigateTo('/');
  };

  return (
    <BotContext.Provider
      value={{
        currentRoute,
        navigateTo,
        activeLicense,
        licenseDetails,
        deviceId,
        signals,
        addSignal,
        clearSignals,
        activateKey,
        deactivateKey,
        appConfig,
        refreshConfig,
        isAuthSettingsOpen,
        setAuthSettingsOpen,
        isVerifying,
        isAdmin,
        setIsAdmin,
      }}
    >
      {children}
    </BotContext.Provider>
  );
};

export function useBot() {
  const ctx = useContext(BotContext);
  if (!ctx) throw new Error('useBot must be used within a BotProvider');
  return ctx;
}
