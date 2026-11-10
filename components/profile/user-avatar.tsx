"use client";

import { useState } from "react";

export function UserAvatar({
  name,
  src,
  size = "large",
}: {
  name: string;
  src: string | null;
  size?: "small" | "large";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("vi-VN") || "?";
  const sizeClassName = size === "large" ? "h-28 w-28 text-3xl" : "h-10 w-10 text-sm";

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-violet-100 font-bold text-violet-700 ring-4 ring-white ${sizeClassName}`}
    >
      {src && failedSrc !== src ? (
        // The avatar endpoint is authenticated and is not served by a public image host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailedSrc(src)}
          src={src}
        />
      ) : (
        initials
      )}
    </span>
  );
}
