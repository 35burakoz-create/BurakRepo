'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../../../lib/auth';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState('');
  const [note, setNote] = useState('');

  async function load() {
    const headers = await authHeaders();
    const res = await fetch(`/api/users/${params.id}`, { headers });
    const json = await res.json();
    if (!res.ok) setError(json.error || 'Hata');
    else {
      setError('');
      setData(json);
    }
  }

  useEffect(() => { load(); }, [params.id]);

  async function updateCooldown() {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/users/${params.id}/cooldown`, {
      method: 'POST', headers, body: JSON.stringify({ cooldown_until: cooldown || null }),
    });
    load();
  }

  async function addNote() {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch('/api/admin-notes', {
      method: 'POST', headers, body: JSON.stringify({ target_type: 'user', target_id: params.id, note }),
    });
    setNote('');
    load();
  }

  if (error) return <div className="card">{error}</div>;
  if (!data) return <div className="card">Yükleniyor...</div>;

  return (
    <div>
      <div className="card">
        <h2>{data.profile?.nickname || 'Kullanıcı'}</h2>
        <p>city_id: {data.profile?.city_id} • mahalle: {data.profile?.neighborhood || '-'}</p>
        <div className="row">
          <input placeholder="YYYY-MM-DDTHH:mm:ssZ" value={cooldown} onChange={(e) => setCooldown(e.target.value)} />
          <button onClick={updateCooldown}>Cooldown Güncelle</button>
        </div>
      </div>
      <div className="card"><h3>Kampanyalar</h3><pre>{JSON.stringify(data.campaigns, null, 2)}</pre></div>
      <div className="card"><h3>Katılımlar</h3><pre>{JSON.stringify(data.joins, null, 2)}</pre></div>
      <div className="card"><h3>Raporlar</h3><pre>{JSON.stringify(data.reports, null, 2)}</pre></div>
      <div className="card"><h3>Audit</h3><pre>{JSON.stringify(data.audit, null, 2)}</pre></div>
      <div className="card"><h3>Admin Notu</h3><textarea value={note} onChange={(e) => setNote(e.target.value)} /><button onClick={addNote}>Kaydet</button></div>
      <div className="card"><h3>Notlar</h3><pre>{JSON.stringify(data.notes, null, 2)}</pre></div>
    </div>
  );
}
