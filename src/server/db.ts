import fs from 'fs';
import path from 'path';

export interface License {
  id: string;
  license_key: string;
  full_name: string;
  phone: string;
  email: string;
  amount: string;
  status: 'pending' | 'approved' | 'blocked';
  duration_label: string;
  expires_at: string | null;
  lifetime: boolean;
  max_devices: number;
  license_devices: string[];
  created_at: string;
  updated_at: string;
}

export interface SignalRecord {
  id: string;
  pair: string;
  market: string;
  timer: string;
  mode: 'live' | 'future';
  direction: 'BUY' | 'SELL';
  entry: string;
  expiry: string;
  accuracy: string;
  strength: string;
  created_at: string;
}

export interface AppConfig {
  apiKey: string;
  recoveryEmail: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  authMode: 'local' | 'api_key_only' | 'supabase_sync';
  allowMasterApiKeyBypass: boolean;
  adminPassword?: string;
  whatsappUrl: string;
  telegramUrl: string;
  phone: string;
  developer: string;
}

export interface DatabaseSchema {
  config: AppConfig;
  licenses: License[];
  signals: SignalRecord[];
}

const isServerless = Boolean(
  process.env.VERCEL ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT
);

const BUNDLED_DATA_DIR = path.resolve(process.cwd(), 'data');
const BUNDLED_DB_FILE = path.join(BUNDLED_DATA_DIR, 'frking.db.json');

// In serverless / read-only environments, use /tmp as the writable storage directory
const DATA_DIR = isServerless ? '/tmp' : BUNDLED_DATA_DIR;
const DB_FILE = isServerless ? path.join('/tmp', 'frking.db.json') : BUNDLED_DB_FILE;

const DEFAULT_CONFIG: AppConfig = {
  apiKey: process.env.API_KEY || 'FRK-PRO-MASTER-KEY-2026',
  recoveryEmail: process.env.RECOVERY_EMAIL || 'emailwaqas7@gmail.com',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  authMode: (process.env.AUTH_MODE as any) || (process.env.SUPABASE_URL ? 'supabase_sync' : 'local'),
  allowMasterApiKeyBypass: process.env.ALLOW_MASTER_KEY_BYPASS !== 'false',
  adminPassword: process.env.ADMIN_PASSWORD || 'FRK@2026#WaqasKing!Secure9x',
  whatsappUrl: process.env.WHATSAPP_URL || 'https://chat.whatsapp.com/G1yKmNVIntiLx7c9KX5zEu',
  telegramUrl: process.env.TELEGRAM_URL || 'https://t.me/frking00',
  phone: process.env.PHONE || '+966554573612',
  developer: process.env.DEVELOPER || '@codetrader',
};

function calculateExpiry(durationLabel: string): { expires_at: string | null; lifetime: boolean } {
  if (durationLabel === 'Lifetime') {
    return { expires_at: null, lifetime: true };
  }
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  let ms = 30 * dayMs;

  switch (durationLabel) {
    case '1 Day': ms = 1 * dayMs; break;
    case '2 Days': ms = 2 * dayMs; break;
    case '3 Days': ms = 3 * dayMs; break;
    case '5 Days': ms = 5 * dayMs; break;
    case '1 Week': ms = 7 * dayMs; break;
    case '15 Days': ms = 15 * dayMs; break;
    case '1 Month': ms = 30 * dayMs; break;
    case '3 Months': ms = 90 * dayMs; break;
    case '6 Months': ms = 180 * dayMs; break;
    case '1 Year': ms = 365 * dayMs; break;
    default: ms = 30 * dayMs; break;
  }

  return {
    expires_at: new Date(now + ms).toISOString(),
    lifetime: false,
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    // 1. Try reading existing DB_FILE (e.g. /tmp/frking.db.json or data/frking.db.json)
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
          licenses: parsed.licenses || [],
          signals: parsed.signals || [],
        };
      }
    } catch (err) {
      console.warn('Could not read from primary DB_FILE:', err);
    }

    // 2. In serverless / read-only, read bundled seed data if DB_FILE is in /tmp
    if (DB_FILE !== BUNDLED_DB_FILE) {
      try {
        if (fs.existsSync(BUNDLED_DB_FILE)) {
          const raw = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
          const parsed = JSON.parse(raw);
          const initialData: DatabaseSchema = {
            config: { ...DEFAULT_CONFIG, ...(parsed.config || {}) },
            licenses: parsed.licenses || [],
            signals: parsed.signals || [],
          };
          this.persist(initialData);
          return initialData;
        }
      } catch (err) {
        console.warn('Could not read from BUNDLED_DB_FILE:', err);
      }
    }

    const initial: DatabaseSchema = {
      config: DEFAULT_CONFIG,
      // No hardcoded license keys — all keys are created dynamically via
      // /api/register-key (user registration) or /api/admin/create-key (admin).
      licenses: [],
      signals: [],
    };

    this.persist(initial);
    return initial;
  }

  private persist(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err: any) {
      // If primary path failed (e.g. read-only filesystem), fallback to /tmp
      if (DATA_DIR !== '/tmp') {
        try {
          if (!fs.existsSync('/tmp')) fs.mkdirSync('/tmp', { recursive: true });
          fs.writeFileSync('/tmp/frking.db.json', JSON.stringify(data, null, 2), 'utf-8');
          return;
        } catch {}
      }
      console.warn('Database in-memory persistence active (file write skipped):', err?.message || err);
    }
  }

  public getConfig(): AppConfig {
    return { ...this.data.config };
  }

  public updateConfig(updates: Partial<AppConfig>): AppConfig {
    this.data.config = {
      ...this.data.config,
      ...updates,
    };
    this.persist(this.data);
    return this.getConfig();
  }

  public getLicenses(): License[] {
    return this.data.licenses;
  }

  public addOrUpdateLicense(lic: License): void {
    const idx = this.data.licenses.findIndex(
      (l) => l.id === lic.id || l.license_key === lic.license_key
    );
    if (idx >= 0) {
      this.data.licenses[idx] = { ...this.data.licenses[idx], ...lic };
    } else {
      this.data.licenses.unshift(lic);
    }
    this.persist(this.data);
  }

  public findLicenseByKey(key: string): License | undefined {
    const cleanKey = key.trim().toUpperCase();
    return this.data.licenses.find(
      (lic) => lic.license_key.trim().toUpperCase() === cleanKey
    );
  }

  public findLicenseById(id: string): License | undefined {
    return this.data.licenses.find((lic) => lic.id === id || lic.license_key === id);
  }

  public createLicense(input: {
    custom_key?: string;
    full_name: string;
    phone: string;
    email: string;
    amount: string;
    duration?: string;
    max_devices?: number;
    status?: 'pending' | 'approved' | 'blocked';
  }): License {
    const rawKey = input.custom_key?.trim().toUpperCase();
    let licenseKey = rawKey;

    if (!licenseKey) {
      const part1 = Math.floor(1000 + Math.random() * 9000);
      const part2 = Math.floor(1000 + Math.random() * 9000);
      const part3 = Math.floor(1000 + Math.random() * 9000);
      licenseKey = `FRK-${part1}-${part2}-${part3}`;
    }

    const durationLabel = input.duration || '1 Month';
    const { expires_at, lifetime } = calculateExpiry(durationLabel);

    const newLic: License = {
      id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      license_key: licenseKey,
      full_name: input.full_name.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      amount: input.amount.trim() || 'Paid',
      status: input.status || 'pending',
      duration_label: durationLabel,
      expires_at: expires_at,
      lifetime: lifetime,
      max_devices: input.max_devices || 1,
      license_devices: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.data.licenses.unshift(newLic);
    this.persist(this.data);
    return newLic;
  }

  public updateLicenseAction(
    idOrKey: string,
    action: string,
    duration?: string,
    maxDevices?: number,
    deviceId?: string
  ): { ok: boolean; error?: string; license?: License } {
    const licIndex = this.data.licenses.findIndex(
      (lic) => lic.id === idOrKey || lic.license_key === idOrKey
    );

    if (licIndex === -1) {
      return { ok: false, error: 'License not found.' };
    }

    const lic = this.data.licenses[licIndex];

    if (action === 'delete') {
      this.data.licenses.splice(licIndex, 1);
      this.persist(this.data);
      return { ok: true };
    }

    if (action === 'approve') {
      lic.status = 'approved';
      if (duration) {
        lic.duration_label = duration;
        const expiry = calculateExpiry(duration);
        lic.expires_at = expiry.expires_at;
        lic.lifetime = expiry.lifetime;
      }
      if (maxDevices !== undefined && maxDevices > 0) {
        lic.max_devices = maxDevices;
      }
      lic.updated_at = new Date().toISOString();
    } else if (action === 'block') {
      lic.status = 'blocked';
      lic.updated_at = new Date().toISOString();
    } else if (action === 'reset_devices') {
      lic.license_devices = [];
      lic.updated_at = new Date().toISOString();
    } else if (action === 'remove_device' && deviceId) {
      lic.license_devices = (lic.license_devices || []).filter(
        (d) => d.trim().toLowerCase() !== deviceId.trim().toLowerCase()
      );
      lic.updated_at = new Date().toISOString();
    } else {
      return { ok: false, error: `Unknown action: ${action}` };
    }

    this.persist(this.data);
    return { ok: true, license: lic };
  }

  public bindDevice(licKey: string, deviceId: string): { ok: boolean; error?: string; license?: License } {
    const cleanKey = licKey.trim().toUpperCase();
    const lic = this.findLicenseByKey(cleanKey);

    if (!lic) {
      return { ok: false, error: 'License key not found.' };
    }

    if (lic.status === 'blocked') {
      return { ok: false, error: 'This license has been blocked by administrator.' };
    }

    if (lic.status === 'pending') {
      return { ok: false, error: 'Payment verification pending. Please wait for admin approval.' };
    }

    if (!lic.lifetime && lic.expires_at && new Date(lic.expires_at) < new Date()) {
      return { ok: false, error: 'License key expired. Please contact admin to renew.' };
    }

    if (!lic.license_devices) {
      lic.license_devices = [];
    }

    const hasDevice = lic.license_devices.some(
      (d) => d.trim().toLowerCase() === deviceId.trim().toLowerCase()
    );

    if (!hasDevice) {
      if (lic.license_devices.length >= lic.max_devices) {
        return {
          ok: false,
          error: `Device limit reached (${lic.license_devices.length}/${lic.max_devices} bound). Please ask admin to reset devices or upgrade limit.`,
        };
      }
      lic.license_devices.push(deviceId.trim());
      lic.updated_at = new Date().toISOString();
      this.persist(this.data);
    }

    return { ok: true, license: lic };
  }

  public addSignal(sig: Omit<SignalRecord, 'created_at'>): SignalRecord {
    const record: SignalRecord = {
      ...sig,
      created_at: new Date().toISOString(),
    };
    this.data.signals.unshift(record);
    if (this.data.signals.length > 500) {
      this.data.signals = this.data.signals.slice(0, 500);
    }
    this.persist(this.data);
    return record;
  }

  public getSignals(limit = 50): SignalRecord[] {
    return this.data.signals.slice(0, limit);
  }
}

export const db = new Database();
