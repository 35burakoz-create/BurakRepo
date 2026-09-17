'use client';

import { FormEvent, useState } from 'react';
import { getBrowserSupabase } from '../../lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function signIn(e: FormEvent) {
    e.preventDefault();
    const { error } = await getBrowserSupabase().auth.signInWithPassword({ email, password });
    setMessage(error ? error.message : 'Giriş başarılı. Gösterge paneline dönebilirsiniz.');
  }

  async function sendMagic() {
    const { error } = await getBrowserSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : 'E-posta giriş bağlantısı gönderildi.');
  }

  return (
    <div className="card">
      <h2>Admin Giriş</h2>
      <form onSubmit={signIn} className="row">
        <input placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input placeholder="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">E-posta/Şifre ile Giriş</button>
        <button type="button" onClick={sendMagic}>E-posta Bağlantısı Gönder</button>
      </form>
      <p className="small">Yalnızca ADMIN_EMAILS allowlist içindeki kullanıcılar API erişimi alır.</p>
      <p>{message}</p>
    </div>
  );
}
