import './globals.css';
import Nav from '../components/Nav';

export const metadata = {
  title: 'Toplu Alım Admin',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>
        <Nav />
        <div className="container">{children}</div>
      </body>
    </html>
  );
}
