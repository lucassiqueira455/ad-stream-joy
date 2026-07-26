import type { PlatformKey } from "./platform-chip";

/**
 * Official-ish brand marks rendered as inline SVG so they scale and inherit sizing.
 * All logos are on a transparent background — the caller controls the tile color.
 */
export function BrandIcon({
  platform,
  className = "h-6 w-6",
}: {
  platform: PlatformKey;
  className?: string;
}) {
  switch (platform) {
    case "meta":
      return (
        <svg viewBox="0 0 36 36" className={className} aria-hidden>
          <defs>
            <linearGradient id="metaG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0064E1" />
              <stop offset="100%" stopColor="#0082FB" />
            </linearGradient>
          </defs>
          <path
            fill="url(#metaG)"
            d="M18 6c-4.8 0-7.7 3.1-10.1 6.9C5.6 16.5 4 20.6 4 23.4c0 3.2 1.9 5.1 4.5 5.1 2.4 0 4.1-1.6 6.4-5 .8-1.2 1.4-2.3 1.4-2.3s-1.7-2.7-2.5-3.9c-1.4-2-2.5-3-3.9-3-1.5 0-2.6 1-3.4 2.3l-1.6-1.1c1.1-2 3-3.9 5.4-3.9 2.4 0 4 1.4 5.5 3.5 1.2 1.7 2.6 4 2.6 4s1.4-2.3 2.9-4.2c1.6-2.1 3.2-3.3 5.4-3.3 3.4 0 5.3 2.8 5.3 6.9 0 4.4-2.4 8.4-5.9 8.4-2.4 0-3.9-1.1-5.4-3.1L21 22.9c1.3 1.6 2.5 2.5 4 2.5 2 0 3.2-2.1 3.2-4.9 0-2.7-1-4.5-2.7-4.5-1.2 0-2.2.8-3.4 2.5-.6.8-1.4 2-1.4 2s.9 1.5 1.9 3c2.2 3.4 3.8 4.9 6.5 4.9 3.7 0 6-3 6-7.7 0-5.5-3.1-9.7-7.5-9.7-2.7 0-4.7 1.4-6.6 3.9C19.9 8.2 18.1 6 18 6z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <defs>
            <radialGradient id="igG" cx="30%" cy="107%" r="150%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="10%" stopColor="#FFDD55" />
              <stop offset="50%" stopColor="#FF543E" />
              <stop offset="100%" stopColor="#C837AB" />
            </radialGradient>
          </defs>
          <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#igG)" />
          <circle cx="24" cy="24" r="9" fill="none" stroke="#fff" strokeWidth="2.6" />
          <circle cx="34.5" cy="13.5" r="2.2" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#1877F2" />
          <path
            fill="#fff"
            d="M28.5 25.6h4l.7-4.6h-4.7v-3c0-1.3.4-2.2 2.3-2.2h2.5V11.7c-.4-.1-1.9-.2-3.6-.2-3.6 0-6 2.2-6 6.2V21h-4v4.6h4V37h4.8V25.6z"
          />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path fill="#FBBC04" d="M9.7 33.7 24 24l14.3 9.7L24 44z" />
          <path fill="#34A853" d="M24 24 9.7 14.3 24 4l14.3 10.3z" />
          <path fill="#4285F4" d="M24 24 38.3 14.3 44 24l-5.7 9.7z" />
          <path fill="#EA4335" d="M24 24 9.7 33.7 4 24l5.7-9.7z" />
        </svg>
      );
    case "ga4":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect x="6" y="6" width="10" height="36" rx="5" fill="#F9AB00" />
          <rect x="19" y="16" width="10" height="26" rx="5" fill="#E37400" />
          <rect x="32" y="24" width="10" height="18" rx="5" fill="#E37400" />
        </svg>
      );
    case "gtm":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <path fill="#8AB4F8" d="M28.6 40.6 8.2 20.2l7-7 20.5 20.4z" />
          <path fill="#4285F4" d="M28.7 7.4 41 19.6 20.6 40 8.4 27.6z" />
          <circle cx="15" cy="35" r="4.5" fill="#246FDB" />
        </svg>
      );
    case "searchconsole":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <circle cx="20" cy="20" r="12" fill="none" stroke="#4285F4" strokeWidth="4" />
          <path stroke="#34A853" strokeWidth="4" strokeLinecap="round" d="m30 30 10 10" />
          <circle cx="20" cy="20" r="5" fill="#FBBC04" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#010101" />
          <path
            fill="#25F4EE"
            d="M31 12h-4.5v20a4.5 4.5 0 1 1-4.5-4.5v-4.6a9 9 0 1 0 9 9V19.9a11 11 0 0 0 6.5 2.1v-4.5A6.6 6.6 0 0 1 31 12z"
          />
          <path
            fill="#FE2C55"
            transform="translate(1.5 1.5)"
            d="M31 12h-4.5v20a4.5 4.5 0 1 1-4.5-4.5v-4.6a9 9 0 1 0 9 9V19.9a11 11 0 0 0 6.5 2.1v-4.5A6.6 6.6 0 0 1 31 12z"
          />
          <path
            fill="#fff"
            d="M30 11h-4.5v20a4.5 4.5 0 1 1-4.5-4.5v-4.6a9 9 0 1 0 9 9V18.9a11 11 0 0 0 6.5 2.1v-4.5A6.6 6.6 0 0 1 30 11z"
          />
        </svg>
      );
  }
}
