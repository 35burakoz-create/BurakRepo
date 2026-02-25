'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

const statuses = ['new', 'contacted', 'approved', 'rejected'];

export default function SponsorshipRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cityId, setCityId] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('new');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [noteById, setNoteById] = useState<Record<string, string>>({});

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/sponsorship-requests?${params.toString()}`, { headers });
    const json = await res.json();
    setRows(json.rows || []);
  }

  useEffect(() => { load(); }, []);

  async function setRowStatus(id: string, nextStatus: string) {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/sponsorship-requests/${id}/status`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ status: nextStatus, note: noteById[id] || '' }),
    });
    load();
  }

  return (
    <div className="card">
      <h2>Sponsorluk Talepleri</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e)=>setCityId(e.target.value)} />
        <select value={type} onChange={(e)=>setType(e.target.value)}>
          <option value="">type: tümü</option>
          <option value="campaign">campaign</option>
          <option value="pickup_point">pickup_point</option>
        </select>
        <select value={status} onChange={(e)=>setStatus(e.target.value)}>
          <option value="">status: tümü</option>
          {statuses.map((s)=><option key={s} value={s}>{s}</option>)}
        </select>
        <input placeholder="başlangıç (ISO)" value={from} onChange={(e)=>setFrom(e.target.value)} />
        <input placeholder="bitiş (ISO)" value={to} onChange={(e)=>setTo(e.target.value)} />
        <button onClick={load}>Filtrele</button>
      </div>
      <table>
        <thead><tr><th>İşletme</th><th>Tip</th><th>Şehir</th><th>Durum</th><th>İletişim</th><th>Tarih</th><th>İşlem</th></tr></thead>
        <tbody>{rows.map((r)=><tr key={r.id}><td>{r.business_name}</td><td>{r.type}</td><td>{r.city_id}</td><td>{r.status}</td><td>{r.contact_phone}</td><td>{formatTrDate(r.created_at)}</td><td><select onChange={(e)=>setRowStatus(r.id, e.target.value)} defaultValue=""><option value="" disabled>Durum seç</option>{statuses.map((s)=><option key={s} value={s}>{s}</option>)}</select><input placeholder="not" value={noteById[r.id] || ''} onChange={(e)=>setNoteById({...noteById,[r.id]:e.target.value})} /></td></tr>)}</tbody>
      </table>
    </div>
  );
}
