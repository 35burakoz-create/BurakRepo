'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authHeaders } from '../../lib/auth';
import { formatTrDate } from '../../lib/format';

export default function PickupPointsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [cityId, setCityId] = useState('tire');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [sponsorById, setSponsorById] = useState<Record<string, string>>({});

  async function load() {
    const headers = await authHeaders();
    const params = new URLSearchParams();
    if (cityId) params.set('city_id', cityId);
    const res = await fetch(`/api/pickup-points?${params.toString()}`, { headers });
    const json = await res.json();
    setRows(json.rows || []);
  }

  useEffect(() => { load(); }, []);

  async function createPoint() {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch('/api/pickup-points', {
      method: 'POST',
      headers,
      body: JSON.stringify({ city_id: cityId, name, address, phone: phone || null }),
    });
    setName('');
    setAddress('');
    setPhone('');
    load();
  }

  async function saveSponsorUntil(row: any) {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/pickup-points/${row.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ sponsored_until: sponsorById[row.id] || null }),
    });
    load();
  }

  async function toggleActive(row: any) {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/pickup-points/${row.id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_active: !row.is_active }),
    });
    load();
  }

  return (
    <div className="card">
      <h2>Teslim Noktaları</h2>
      <div className="row">
        <input placeholder="şehir_id" value={cityId} onChange={(e)=>setCityId(e.target.value)} />
        <button onClick={load}>Listele</button>
      </div>
      <div className="row">
        <input placeholder="name" value={name} onChange={(e)=>setName(e.target.value)} />
        <input placeholder="address" value={address} onChange={(e)=>setAddress(e.target.value)} />
        <input placeholder="phone" value={phone} onChange={(e)=>setPhone(e.target.value)} />
        <button onClick={createPoint}>Ekle</button>
      </div>
      <table>
        <thead><tr><th>Ad</th><th>Şehir</th><th>Adres</th><th>Telefon</th><th>Sponsor Bitiş</th><th>Aktif</th><th>Detay</th><th></th></tr></thead>
        <tbody>{rows.map((r)=><tr key={r.id}><td>{r.name}</td><td>{r.city_id}</td><td>{r.address}</td><td>{r.phone || '-'}</td><td><input placeholder="ISO tarih" value={sponsorById[r.id] ?? (r.sponsored_until || '')} onChange={(e)=>setSponsorById({...sponsorById,[r.id]:e.target.value})} /><button onClick={()=>saveSponsorUntil(r)}>Kaydet</button></td><td>{String(r.is_active)}</td><td><Link href={`/pickup-points/${r.id}`}>Detay</Link></td><td><button onClick={()=>toggleActive(r)}>{r.is_active ? 'Pasifleştir' : 'Aktifleştir'}</button></td></tr>)}</tbody>
      </table>
    </div>
  );
}
