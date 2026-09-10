'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

export default function ReportsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [cityId, setCityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/reports?${params.toString()}`, { headers });
    const json = await res.json();
    setRows(json.rows || []);
  }

  useEffect(() => { load(); }, []);

  async function resolve(id: string) {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/reports/${id}/resolve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ note: noteById[id] || '' }),
    });
    load();
  }

  return (
    <div className="card">
      <h2>Rapor Kuyruğu</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e) => setCityId(e.target.value)} />
        <input placeholder="başlangıç (ISO)" value={from} onChange={(e) => setFrom(e.target.value)} />
        <input placeholder="bitiş (ISO)" value={to} onChange={(e) => setTo(e.target.value)} />
        <button onClick={load}>Filtrele</button>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Sebep</th><th>Kampanya</th><th>Tarih</th><th>İşlem</th></tr></thead>
        <tbody>{rows.map((r)=> (
          <tr key={r.id}>
            <td>{r.id}</td><td>{r.reason}</td><td>{r.campaign_id}</td><td>{formatTrDate(r.created_at)}</td>
            <td>
              <input placeholder="çözüm notu" value={noteById[r.id] || ''} onChange={(e)=>setNoteById({...noteById,[r.id]:e.target.value})} />
              <button onClick={()=>resolve(r.id)}>Handled</button>
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
