import LoginButton from '@/components/LoginButton';
import NavMenu from '@/components/NavMenu';

export default function SiteHeader() {
  return (
    <header className="flex h-16 w-full items-center justify-center bg-[var(--color-bg-dark)] fixed left-0 top-0 z-50">
      {/*  header 는 가로 전체, 높이설정, 내부에 logo, menu, login component 가 있음 */}
      <div className="flex w-full h-full items-center justify-between px-6 max-w-[1200px]">
        <div className="flex gap-8 ">
          <div className="text-white">Logo</div>
          <NavMenu />
        </div>
        <LoginButton />
      </div>
    </header>
  );
}
