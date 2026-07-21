'use client';

import { usePathname } from 'next/navigation';
import { UserIcon } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/Icons';
import { authApi } from '@/lib/api';
import { useAuthMe, useLogout } from '@/lib/hooks';
import { Avatar, AvatarFallback } from '@/components/shadcn/avatar';
import { Button } from '@/components/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { Skeleton } from '@/components/shadcn/skeleton';

export default function LoginButton() {
  const pathname = usePathname();
  const { data: user, isLoading } = useAuthMe();
  const logout = useLogout();

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
    <DropdownMenu>
      <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        <Avatar>
          <AvatarFallback>
            <UserIcon className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => logout.mutate()}>로그아웃</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
