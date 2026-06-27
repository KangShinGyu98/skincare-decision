'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import NavMenuLink from '@/components/NavMenuLink';
import NavMenuList from '@/components/NavMenuList';

export type MenuItem = {
  id: string;
  label: string;
  link: string;
  children?: MenuItem[];
};

export const menuItems: MenuItem[] = [
  {
    id: 'priority-gate',
    label: '루틴 점검',
    link: '/priority-gate',
  },
  {
    id: 'category-decision',
    label: '구매 체크리스트',
    link: '/category-decision',
    children: [
      {
        id: 'toner',
        label: '토너',
        link: '/category-decision?category=toner',
      },
      {
        id: 'sunscreen',
        label: '선크림',
        link: '/category-decision?category=sunscreen',
      },
      {
        id: 'serum',
        label: '세럼',
        link: '/category-decision?category=serum',
      },
      {
        id: 'lipcare',
        label: '립케어',
        link: '/category-decision?category=lipcare',
      },
      {
        id: 'moisturizer',
        label: '로션 / 크림',
        link: '/category-decision?category=moisturizer',
      },
      {
        id: 'cleanser',
        label: '클렌저',
        link: '/category-decision?category=cleanser',
      },
    ],
  },
];

//Link 로 메뉴(url 에서 카테고리 가져와서 active, hover 처리 등 ) 구현 +
export default function NavMenu() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentUrl = `${pathname}?${searchParams.toString()}`;
  const hasChildren = (item: MenuItem): boolean => {
    return (item.children?.length ?? 0) > 0;
  };
  //자기, 또는 자식에 url 과 일치할 때
  const isActive = (id: string) => {
    if (!id) return false;

    return currentUrl.includes(id);
  };
  return (
    <nav>
      <ul className="flex gap-4 h-full">
        {menuItems.map((item) => {
          return hasChildren(item) ? (
            <NavMenuList key={item.id} isActive={isActive(item.id)} item={item} />
          ) : (
            <NavMenuLink key={item.id} isActive={isActive(item.id)} item={item} />
          );
        })}
      </ul>
    </nav>
  );
}
