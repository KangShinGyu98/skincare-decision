import type { SVGProps } from 'react';

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="currentColor" {...props}>
      <path
        fillOpacity={0.85}
        d="M32.946 7.715h-3.013c-.205 0-.398.1-.519.265L18 23.714 6.585 7.98a.645.645 0 0 0-.518-.265H3.053a.323.323 0 0 0-.261.51l14.167 19.53a1.282 1.282 0 0 0 2.077 0l14.167-19.53a.32.32 0 0 0-.257-.51Z"
      />
    </svg>
  );
}

export function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="currentColor" {...props}>
      <path
        fillOpacity={0.85}
        d="M33.208 27.776 19.04 8.245a1.282 1.282 0 0 0-2.078 0l-14.17 19.53a.322.322 0 0 0 .26.511h3.014c.205 0 .398-.1.518-.265L18 12.287 29.415 28.02c.12.165.313.265.518.265h3.014a.323.323 0 0 0 .26-.51Z"
      />
    </svg>
  );
}
export function WalletIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="currentColor" {...props}>
      <path
        fillOpacity={0.85}
        d="M30.938 3.938H5.063c-.623 0-1.125.502-1.125 1.124v25.875c0 .623.502 1.125 1.124 1.125h25.875c.623 0 1.125-.502 1.125-1.124V5.063c0-.623-.502-1.125-1.124-1.125ZM29.53 20.25H18.563v-4.5H29.53v4.5Zm0-6.75H17.438c-.623 0-1.125.503-1.125 1.125v6.75c0 .622.502 1.125 1.125 1.125H29.53v7.031H6.47V6.47H29.53V13.5Z"
      />
      <path fillOpacity={0.85} d="M20.39 18a1.407 1.407 0 1 0 2.814 0 1.407 1.407 0 0 0-2.813 0Z" />
      <path
        fillOpacity={0.35}
        d="M18.563 20.25H29.53v-4.5H18.563v4.5Zm3.234-3.656a1.406 1.406 0 1 1 0 2.811 1.406 1.406 0 0 1 0-2.811Z"
      />
      <path
        fillOpacity={0.35}
        d="M6.469 29.531H29.53V22.5H17.438a1.124 1.124 0 0 1-1.125-1.125v-6.75c0-.622.502-1.125 1.125-1.125H29.53V6.469H6.47V29.53Z"
      />
    </svg>
  );
}
