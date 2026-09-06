import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RoutineOS — The routine execution OS',
  description:
    'Build reusable systems, lock your next day, execute with focus, and track honest progress in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
