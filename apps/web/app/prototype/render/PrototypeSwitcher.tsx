"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const variants = [
  { key: "A", name: "Panoramic literary journey" },
  { key: "B", name: "Premium conversion cards" },
  { key: "C", name: "Cinematic dark atlas" },
];

export function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentIndex = Math.max(0, variants.findIndex((variant) => variant.key === current));
  const currentVariant = variants[currentIndex] ?? variants[0]!;

  function go(direction: -1 | 1) {
    const next = variants[(currentIndex + direction + variants.length) % variants.length] ?? variants[0]!;
    const params = new URLSearchParams(searchParams.toString());
    params.set("variant", next.key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="prototype-switcher" aria-label="Prototype variant switcher">
      <button type="button" onClick={() => go(-1)}>←</button>
      <span>{currentVariant.key} — {currentVariant.name}</span>
      <button type="button" onClick={() => go(1)}>→</button>
    </div>
  );
}
