'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

export default function CampaignsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cityId, setCityId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sponsoredOnly, setSponsoredOnly] = useState(false);

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (sponsoredOnly) params.set('sponsored', '1');
    const res = await fetch(`/api/campaigns?${params.toString()}`, { headers });
    const json = await res.json();
    setRows(json.rows || []);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card">
      <h2>Kampanyalar</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e) => setCityId(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tümü</option><option value="active">aktif</option><option value="completed">tamamlandı</option><option value="cancelled">iptal</option>
        </select>
        <input placeholder="başlangıç (ISO)" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input placeholder="bitiş (ISO)" value={to} onChange={(e) => setTo(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={sponsoredOnly} onChange={(e) => setSponsoredOnly(e.target.checked)} />
          Sadece sponsorlu kampanyalar
        </label>
        <button onClick={load}>Filtrele</button>
      </div>
      <table>
        <thead><tr><th>Başlık</th><th>Şehir</th><th>Durum</th><th>Sponsor</th><th>Sponsor Bitiş</th><th>Sahip</th><th>Bitiş</th><th></th></tr></thead>
        <tbody>{rows.map((r)=><tr key={r.id}><td>{r.title}</td><td>{r.city_id}</td><td>{r.status}</td><td>{r.featured ? (r.sponsor_name || 'Sponsorlu') : '-'}</td><td>{formatTrDate(r.sponsor_until)}</td><td>{r.created_by}</td><td>{formatTrDate(r.ends_at)}</td><td><Link href={`/campaigns/${r.id}`}>Detay</Link></td></tr>)}</tbody>
      </table>
    </div>
  );
}
