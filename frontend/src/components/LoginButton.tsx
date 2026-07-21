'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowDownIcon, ArrowUpIcon, GoogleIcon } from '@/components/icons/Icons';
import { authApi } from '@/lib/api';
import { useAuthMe, useLogout } from '@/lib/hooks';
import { Button } from '@/components/shadcn/button';
import { Skeleton } from '@/components/shadcn/skeleton';

export default function LoginButton() {
  const pathname = usePathname();
  const { data: user, isLoading } = useAuthMe();
  const logout = useLogout();
  const [isOpen, setIsOpen] = useState(false);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);
  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextFocusedElement)) {
      setIsOpen(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-lg" />;
  }

  if (!user) {
    return (
      <Button
        variant="outline"
        onClick={() => {
          window.location.href = authApi.getGoogleLoginUrl(pathname);
        }}
      >
        <GoogleIcon className="size-4" />
        Google로 로그인
      </Button>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenu}
      onFocus={openMenu}
      onBlur={handleBlur}
    >
      <button
        type="button"
        className="flex items-center gap-1 text-[var(--color-text-inverse)] underline underline-offset-4 hover:text-[var(--color-primary)]"
      >
        <span>{user.email}</span>
        {isOpen ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-full z-50 pt-2">
          <ul className="w-40 rounded-xl border border-[color:var(--color-border-light)] bg-[var(--color-bg-white)] p-3 shadow-lg">
            <li>
              <button
                type="button"
                onClick={() => logout.mutate()}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-dark-hover)] hover:text-[var(--color-text-inverse)]"
              >
                로그아웃
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
