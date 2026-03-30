import { useState } from 'react';

export function useCepLookup() {
  const [loadingCep, setLoadingCep] = useState(false);

  async function handleCepChange<T extends { zip_code: string; address: string; city: string; state: string }>(
    raw: string,
    setData: React.Dispatch<React.SetStateAction<T>>
  ) {
    const digits = raw.replace(/\D/g, '');
    const formatted = digits.length > 5
      ? `${digits.slice(0, 5)}-${digits.slice(5, 8)}`
      : digits;

    setData(prev => ({ ...prev, zip_code: formatted }));

    if (digits.length === 8) {
      setLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setData(prev => ({
            ...prev,
            address: data.logradouro || prev.address,
            city: data.localidade || prev.city,
            state: data.uf || prev.state,
          }));
        }
      } catch {
        // silent fail — user fills manually
      } finally {
        setLoadingCep(false);
      }
    }
  }

  return { handleCepChange, loadingCep };
}
