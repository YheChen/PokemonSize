"use client";

/** Warms the browser cache for the next round so art never pops in late. */
export function AssetPreloader({ urls }: { urls: readonly string[] }) {
  if (urls.length === 0) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed h-px w-px opacity-0">
      {urls.map((url) => (
        <img key={url} src={url} alt="" width={1} height={1} decoding="async" />
      ))}
    </div>
  );
}
