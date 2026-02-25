'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

export default function UsersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cityId, setCityId] = useState('');
  const [query, setQuery] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (query) params.set('q', query);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/users?${params.toString()}`, { headers });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Hata');
    else {
      setError('');
      setRows(json.rows || []);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="card">
      <h2>Kullanıcılar</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e) => setCityId(e.target.value)} />
        <input placeholder="nickname ara" value={query} onChange={(e) => setQuery(e.target.value)} />
        <input placeholder="başlangıç (ISO)" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input placeholder="bitiş (ISO)" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={load}>Filtrele</button>
      </div>
      {error && <p>{error}</p>}
      <table>
        <thead><tr><th>Takma Ad</th><th>Şehir</th><th>Mahalle</th><th>Bekleme Süresi</th><th>Kampanya</th><th>Katılım</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.nickname}</td><td>{r.city_id}</td><td>{r.neighborhood || '-'}</td><td>{formatTrDate(r.cooldown_until)}</td><td>{r.campaign_count || 0}</td><td>{r.join_count || 0}</td>
              <td><Link href={`/users/${r.id}`}>Detay</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
