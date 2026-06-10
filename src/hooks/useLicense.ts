import { useCallback, useEffect, useState } from 'react';
import { getLicenseStatus, LicenseStatus } from '../services/licenseService';

const DEFAULT: LicenseStatus = {
  isPro: false, isTrialActive: true, isExpired: false,
  daysLeft: 1, hoursLeft: 24, trialStartedAt: null,
};

// Shared refresh trigger so any screen can force a re-check after activation
let _listeners: Array<() => void> = [];
export function refreshLicense() { _listeners.forEach(fn => fn()); }

export function useLicense() {
  const [status, setStatus] = useState<LicenseStatus>(DEFAULT);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Safe default — treat as active trial until DB loads
    try {
      const s = await getLicenseStatus();
      setStatus(s);
    } catch (e) {
      console.warn('License check failed:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    _listeners.push(load);
    return () => { _listeners = _listeners.filter(l => l !== load); };
  }, [load]);

  return { ...status, loading };
}
