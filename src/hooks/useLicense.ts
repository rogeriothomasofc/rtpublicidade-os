import { useState, useEffect } from 'react';

// URL do servidor de licenças do dono do sistema
// Troque pela sua URL antes de publicar
const LICENSE_SERVER = 'https://licencas.rtpublicidade.com.br';
const LICENSE_KEY    = import.meta.env.VITE_LICENSE_KEY as string | undefined;

const CACHE_KEY   = 'agencyos_license_ok_until';
const CACHE_HOURS = 24;
const GRACE_DAYS  = 7; // dias offline antes de bloquear

export type LicenseStatus = 'checking' | 'valid' | 'suspended' | 'invalid';

export function useLicense() {
  // Sem chave = instalação do próprio dono, sempre válida
  const [status, setStatus] = useState<LicenseStatus>(
    LICENSE_KEY ? 'checking' : 'valid'
  );

  useEffect(() => {
    if (!LICENSE_KEY) return;

    const cachedUntil = Number(localStorage.getItem(CACHE_KEY) || 0);
    if (Date.now() < cachedUntil) {
      setStatus('valid');
      return;
    }

    fetch(`${LICENSE_SERVER}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key:    LICENSE_KEY,
        domain: window.location.hostname,
      }),
      signal: AbortSignal.timeout(8000),
    })
      .then(r => r.json())
      .then(data => {
        if (data.valid) {
          const until = Date.now() + CACHE_HOURS * 3_600_000;
          localStorage.setItem(CACHE_KEY, String(until));
          setStatus('valid');
        } else {
          localStorage.removeItem(CACHE_KEY);
          setStatus(data.status === 'suspended' ? 'suspended' : 'invalid');
        }
      })
      .catch(() => {
        // Sem internet: período de graça de 7 dias antes de bloquear
        const lastValid = Number(localStorage.getItem(CACHE_KEY) || 0);
        const graceUntil = lastValid + GRACE_DAYS * 86_400_000;
        setStatus(Date.now() < graceUntil ? 'valid' : 'invalid');
      });
  }, []);

  return status;
}
