import { type MenuItem } from '@/components/NavMenu';
import Link from 'next/link';

type NavMenuItemProps = {
  isActive: boolean;
  item: MenuItem;
};

export default function NavMenuLink({ isActive, item }: NavMenuItemProps) {
  //   li, Link, active 면 색상 바꾸기,

  return (
    <li>
      <Link
        href={item.link}
        className={
          isActive
            ? 'text-[var(--color-primary)] underline underline-offset-4'
            : 'text-white hover:text-[var(--color-primary)]'
        }
      >
        {item.label}
      </Link>
    </li>
  );
}
