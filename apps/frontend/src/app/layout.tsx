import type { Metadata } from 'next';
import ConsoleFilter from '@/components/ConsoleFilter';
import './globals.css';

export const metadata: Metadata = {
  title: 'ZK Face Login',
  description: 'ZK Face Login MVP on Solana',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ConsoleFilter />
        {children}
      </body>
    </html>
  );
}
