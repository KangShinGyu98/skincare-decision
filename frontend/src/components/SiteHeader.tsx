import LoginButton from '@/components/LoginButton';
import NavMenu from '@/components/NavMenu';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 flex h-[var(--header-height)] w-full shrink-0 items-center justify-center bg-[var(--color-bg-dark)]">
      {/*  header 는 가로 전체, 높이설정, 내부에 logo, menu, login component 가 있음 */}
      <div className="flex w-full h-full items-center justify-between px-6 max-w-[1200px]">
        <div className="flex gap-8 justify-center items-center">
          <Link className="flex gap-2 items-center cursor-pointer" href="/">
            <Image
              src="/web-app-manifest-192x192.png"
              alt="구매지기"
              width={192}
              height={192}
              priority
              className="size-10 rounded-lg"
            />
            <div className="text-white text-[24px] font-bold">구매지기</div>
          </Link>
          <Suspense fallback={null}>
            <NavMenu />
          </Suspense>
        </div>
        <LoginButton />
      </div>
    </header>
  );
}
