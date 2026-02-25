'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../../../lib/auth';
import { formatTrDate } from '../../../lib/format';

export default function PickupPointDetailPage({ params }: { params: { id: string } }) {
  const [point, setPoint] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);

  async function load() {
    const headers = await authHeaders();
    const res = await fetch(`/api/pickup-points/${params.id}/entitlements`, { headers });
    const json = await res.json();
    setPoint(json.point);
    setRows(json.rows || []);
  }

  useEffect(() => { load(); }, [params.id]);

  async function refreshVerification(entitlementId: string) {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    const res = await fetch(`/api/billing/entitlements/${entitlementId}/refresh`, {
      method: 'POST',
      headers,
      body: '{}',
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || 'Doğrulama yenileme başarısız');
      return;
    }
    alert(`Doğrulama yenilendi: ${json.state}`);
    load();
  }

  if (!point) return <div className="card">Yükleniyor...</div>;

  return (
    <div className="card">
      <h2>{point.name}</h2>
      <p>Sponsor bitiş: {formatTrDate(point.sponsored_until)}</p>
      <h3>Entitlement Kayıtları</h3>
      <table>
        <thead><tr><th>Ürün</th><th>Bitiş</th><th>Durum</th><th>Son Doğrulama</th><th></th></tr></thead>
        <tbody>{rows.map((r)=><tr key={r.id}><td>{r.product_id}</td><td>{formatTrDate(r.expires_at)}</td><td>{r.state}</td><td>{formatTrDate(r.last_verified_at)}</td><td><button onClick={()=>refreshVerification(r.id)}>Doğrulamayı Yenile</button></td></tr>)}</tbody>
      </table>
    </div>
  );
}
