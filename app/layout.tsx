import type { Metadata } from 'next';
import './globals.css';
import { LangProvider } from '@/lib/lang-context';

export const metadata: Metadata = {
  title: 'Underworld Platform',
  description:
    '専門家AIたちが集う、神秘的な3D知識世界。THE Seedから生成されるUnderworldで、複数のExpert AIと議論し、統合された知見を得る。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <LangProvider>{children}</LangProvider>
      </body>
    </html>
  );
}
