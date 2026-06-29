'use client';

import { useEffect, useState } from 'react';

const categories = ['선크림', '토너', '세럼', '립케어', '로션 / 크림', '클렌저'];

export function RotatingCategoryText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setIndex((currentIndex) => (currentIndex + 1) % categories.length);
    }, 1800);

    return () => window.clearInterval(timerId);
  }, []);

  return (
    <span
      key={categories[index]}
      className="inline-block animate-[word-change_400ms_ease] text-[var(--color-primary)]"
    >
      {categories[index]}
    </span>
  );
}
