'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import ConsentForm from '@/components/ConsentForm';
import { ArrowDownIcon, ArrowUpIcon, GoogleIcon } from '@/components/icons/Icons';
import { Button } from '@/components/shadcn/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/shadcn/dialog';
import { Skeleton } from '@/components/shadcn/skeleton';
import { authApi } from '@/lib/api';
import { useAuthMe, useLogout } from '@/lib/hooks';

const NAV_LINK_CLASS =
  'flex items-center gap-1 text-[var(--color-text-inverse)] underline underline-offset-4 hover:text-[var(--color-primary)]';

export default function LoginButton() {
  const pathname = usePathname();
  const { data: user, isLoading } = useAuthMe();
  const logout = useLogout();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [isConsentDialogOpen, setIsConsentDialogOpen] = useState(false);
  const [lastSeenConsentRequired, setLastSeenConsentRequired] = useState(user?.consentRequired);

  if (user?.consentRequired !== lastSeenConsentRequired) {
    setLastSeenConsentRequired(user?.consentRequired);

    if (user?.consentRequired) {
      setIsConsentDialogOpen(true);
    }
  }

  const openMenu = () => setIsMenuOpen(true);
  const closeMenu = () => setIsMenuOpen(false);
  const handleMenuBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextFocusedElement)) {
      setIsMenuOpen(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-lg" />;
  }

  if (!user) {
    return (
      <Dialog open={isLoginDialogOpen} onOpenChange={setIsLoginDialogOpen}>
        <DialogTrigger className={NAV_LINK_CLASS}>로그인/회원가입</DialogTrigger>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>로그인/회원가입</DialogTitle>
          </DialogHeader>
          <Button
            variant="outline"
            onClick={() => {
              window.location.href = authApi.getGoogleLoginUrl(pathname);
            }}
          >
            <GoogleIcon className="size-4" />
            Google로 로그인하기
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <div
        className="relative"
        onMouseEnter={openMenu}
        onMouseLeave={closeMenu}
        onFocus={openMenu}
        onBlur={handleMenuBlur}
      >
        <button type="button" className={NAV_LINK_CLASS}>
          <span>{user.email}</span>
          {isMenuOpen ? <ArrowUpIcon className="size-3" /> : <ArrowDownIcon className="size-3" />}
        </button>
        {isMenuOpen ? (
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
      <Dialog open={isConsentDialogOpen} onOpenChange={setIsConsentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <ConsentForm onAgreed={() => setIsConsentDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
