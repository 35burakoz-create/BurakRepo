'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../lib/auth';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const headers = await authHeaders();
      const res = await fetch('/api/kpis', { headers });
      const json = await res.json();
      if (!res.ok) setError(json.error || 'Hata');
      else setData(json);
    })();
  }, []);

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Yükleniyor...</div>;

  return (
    <div className="row">
      <div className="card"><h3>Kullanıcı</h3><div>{data.usersCount}</div></div>
      <div className="card"><h3>Aktif Kampanya</h3><div>{data.activeCampaigns}</div></div>
      <div className="card"><h3>24s Katılım</h3><div>{data.joinsLast24h}</div></div>
      <div className="card"><h3>Rapor</h3><div>{data.reportsCount}</div></div>
    </div>
  );
}
