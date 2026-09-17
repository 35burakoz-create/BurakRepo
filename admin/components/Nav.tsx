'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getBrowserSupabase } from '../lib/supabase-browser';

export default function Nav() {
  const [email, setEmail] = useState<string>('');

  useEffect(() => {
    getBrowserSupabase().auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? '');
    });
  }, []);

  return (
    <div className="nav">
      <div className="container">
        <strong>Toplu Alım Admin</strong>
        <Link href="/">Gösterge Paneli</Link>
        <Link href="/users">Kullanıcılar</Link>
        <Link href="/campaigns">Kampanyalar</Link>
        <Link href="/reports">Raporlar</Link>
        <Link href="/sponsorship-requests">Sponsorluk Talepleri</Link>
        <Link href="/sponsorships">Sponsorluklar</Link>
        <Link href="/pickup-points">Teslim Noktaları</Link>
        <span style={{ marginLeft: 'auto' }} className="small">{email}</span>
      </div>
    </div>
  );
}
