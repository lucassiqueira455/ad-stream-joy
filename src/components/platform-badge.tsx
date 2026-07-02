import type { Platform } from "@/lib/mock-data";

export function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = platform === "meta";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${
        meta
          ? "bg-meta/10 text-meta"
          : "bg-google/10 text-google"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${meta ? "bg-meta" : "bg-google"}`}
      />
      {meta ? "Meta Ads" : "Google Ads"}
    </span>
  );
}
