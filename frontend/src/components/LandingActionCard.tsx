import Link from 'next/link';
import type { ReactNode } from 'react';

type LandingActionCardProps = {
  href: string;
  children: ReactNode;
};

export function LandingActionCard({ href, children }: LandingActionCardProps) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-[var(--color-border-card)] bg-[var(--color-bg-card)] p-6 shadow-[var(--shadow-card)] transition-all hover:-translate-y-1 hover:border-[var(--color-border-card-hover)] hover:bg-[var(--color-bg-card-hover)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <article className="flex h-full flex-col">{children}</article>
    </Link>
  );
}
