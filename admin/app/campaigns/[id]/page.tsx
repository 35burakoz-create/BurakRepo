'use client';

import { useEffect, useState } from 'react';
import { authHeaders } from '../../../lib/auth';

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [note, setNote] = useState('');
  const [featured, setFeatured] = useState(false);
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUntil, setSponsorUntil] = useState('');

  async function load() {
    const headers = await authHeaders();
    const res = await fetch(`/api/campaigns/${params.id}`, { headers });
    const json = await res.json();
    setData(json);
    setFeatured(json.campaign?.featured === true);
    setSponsorName(json.campaign?.sponsor_name || '');
    setSponsorUntil(json.campaign?.sponsor_until || '');
  }

  useEffect(() => { load(); }, [params.id]);

  async function setStatus(status: 'completed' | 'cancelled') {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/campaigns/${params.id}/status`, { method: 'POST', headers, body: JSON.stringify({ status }) });
    load();
  }


  async function saveSponsor() {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch(`/api/campaigns/${params.id}/sponsor`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        featured,
        sponsor_name: sponsorName,
        sponsor_until: sponsorUntil || null,
      }),
    });
    load();
  }

  async function addNote() {
    const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
    await fetch('/api/admin-notes', {
      method: 'POST', headers, body: JSON.stringify({ target_type: 'campaign', target_id: params.id, note }),
    });
    setNote('');
    load();
  }

  if (!data) return <div className="card">Yükleniyor...</div>;

  return (
    <div>
      <div className="card">
        <h2>{data.campaign?.title}</h2>
        <p>Durum: {data.campaign?.status} • katılımcı: {data.participantsCount}</p>
        <div className="row">
          <button onClick={() => setStatus('completed')}>Admin Tamamla</button>
          <button onClick={() => setStatus('cancelled')}>Admin İptal</button>
        </div>
        <hr />
        <h4>Sponsorlu</h4>
        <div className="row">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Featured
          </label>
          <input placeholder="sponsor adı" value={sponsorName} onChange={(e) => setSponsorName(e.target.value)} />
          <input placeholder="sponsor bitiş (ISO)" value={sponsorUntil} onChange={(e) => setSponsorUntil(e.target.value)} />
          <button onClick={saveSponsor}>Sponsor Ayarlarını Kaydet</button>
        </div>
      </div>
      <div className="card"><h3>Katılımcılar</h3><pre>{JSON.stringify(data.participants, null, 2)}</pre></div>
      <div className="card"><h3>Audit</h3><pre>{JSON.stringify(data.audit, null, 2)}</pre></div>
      <div className="card"><h3>Not Ekle</h3><textarea value={note} onChange={(e) => setNote(e.target.value)} /><button onClick={addNote}>Kaydet</button></div>
      <div className="card"><h3>Notlar</h3><pre>{JSON.stringify(data.notes, null, 2)}</pre></div>
    </div>
  );
}
