import type { SVGProps } from 'react';

export function ArrowDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="currentColor"
      {...props}
    >
      <path
        fillOpacity={0.85}
        d="M32.946 7.715h-3.013c-.205 0-.398.1-.519.265L18 23.714 6.585 7.98a.645.645 0 0 0-.518-.265H3.053a.323.323 0 0 0-.261.51l14.167 19.53a1.282 1.282 0 0 0 2.077 0l14.167-19.53a.32.32 0 0 0-.257-.51Z"
      />
    </svg>
  );
}

export function ArrowUpIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 36 36"
      fill="currentColor"
      {...props}
    >
      <path
        fillOpacity={0.85}
        d="M33.208 27.776 19.04 8.245a1.282 1.282 0 0 0-2.078 0l-14.17 19.53a.322.322 0 0 0 .26.511h3.014c.205 0 .398-.1.518-.265L18 12.287 29.415 28.02c.12.165.313.265.518.265h3.014a.323.323 0 0 0 .26-.51Z"
      />
    </svg>
  );
}
