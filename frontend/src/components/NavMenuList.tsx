'use client';
import { type MenuItem } from '@/components/NavMenu';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from './icons/Icons';
type NavMenuListProps = { isActive: boolean; item: MenuItem };
export default function NavMenuList({ isActive, item }: NavMenuListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const openSubmenu = () => {
    if (hasChildren) {
      setIsOpen(true);
    }
  };
  const closeSubmenu = () => {
    if (hasChildren) {
      setIsOpen(false);
    }
  };
  const handleBlur = (event: React.FocusEvent<HTMLLIElement>) => {
    const nextFocusedElement = event.relatedTarget as Node | null;
    if (!event.currentTarget.contains(nextFocusedElement)) {
      setIsOpen(false);
    }
  };
  return (
    <li
      className="relative"
      onMouseEnter={openSubmenu}
      onMouseLeave={closeSubmenu}
      onFocus={openSubmenu}
      onBlur={handleBlur}
    >
      <Link
        href={item.link}
        className={
          isActive
            ? 'flex items-center gap-1 text-[var(--color-primary)] underline underline-offset-4'
            : 'flex items-center gap-1 text-[var(--color-text-inverse)] hover:text-[var(--color-primary)]'
        }
      >
        <span>{item.label}</span>
        {hasChildren ? (
          isOpen ? (
            <ArrowUpIcon className="size-3" />
          ) : (
            <ArrowDownIcon className="size-3" />
          )
        ) : null}
      </Link>
      {hasChildren && isOpen ? (
        <div className="absolute left-0 top-full z-50 pt-2">
          <ul className="w-64 rounded-xl border border-[color:var(--color-border-light)] bg-[var(--color-bg-white)] p-3 shadow-lg">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={child.link}
                  className="block rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-dark-hover)] hover:text-[var(--color-text-inverse)]"
                >
                  {child.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}
