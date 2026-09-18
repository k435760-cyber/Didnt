'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 컨테이너 폭을 구독한다. SVG 차트를 뷰포트 변화에 맞춰 다시 그리기 위한 최소 훅.
 *
 * fallback 은 측정 전 첫 프레임에만 쓰이므로, 가장 좁은 대상 기기(360px)에서도
 * 넘치지 않을 값으로 둔다. 컨테이너가 SVG 의 내재 폭 때문에 넓어지는 일이 없도록
 * 호출부에서 min-w-0 과 max-width 를 함께 걸어야 한다.
 */
export function useElementWidth<T extends HTMLElement>(fallback = 300) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const next = Math.round(entry.contentRect.width);
      if (next <= 0) return;
      setWidth((current) => (Math.abs(current - next) > 1 ? next : current));
    });

    observer.observe(element);
    const measured = Math.round(element.getBoundingClientRect().width);
    if (measured > 0) setWidth(measured);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}
