'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

export default function SponsorshipsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cityId, setCityId] = useState('');
  const [expiringDays, setExpiringDays] = useState('7');
  const [activeOnly, setActiveOnly] = useState(true);

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    params.set('expiring_days', expiringDays || '7');
    if (activeOnly) params.set('active_only', '1');

    const res = await fetch(`/api/sponsorships?${params.toString()}`, { headers });
    const json = await res.json();
    setRows(json.rows || []);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="card">
      <h2>Sponsorluklar</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e) => setCityId(e.target.value)} />
        <input placeholder="kaç gün içinde bitecek" value={expiringDays} onChange={(e) => setExpiringDays(e.target.value)} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          Sadece aktif sponsorluklar
        </label>
        <button onClick={load}>Filtrele</button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Teslim Noktası</th><th>Şehir</th><th>Sponsor Bitiş</th><th>Aktif</th><th>{expiringDays || '7'} gün içinde</th><th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.city_id}</td>
              <td>{formatTrDate(r.sponsored_until)}</td>
              <td>{r.is_active_sponsored ? 'Evet' : 'Hayır'}</td>
              <td>{r.is_expiring_soon ? '⚠️' : '-'}</td>
              <td><Link href={`/pickup-points/${r.id}`}>Detay</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
