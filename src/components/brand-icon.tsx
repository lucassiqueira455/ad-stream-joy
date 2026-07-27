import type { PlatformKey } from "./platform-chip";

/**
 * Official brand marks rendered as inline SVG.
 * Each icon fills its viewBox edge-to-edge so it sits flush inside a square tile.
 * The caller controls sizing via `className` (width/height utilities).
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
      // Meta's infinity/loop mark on a blue gradient tile.
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <defs>
            <linearGradient id="metaTile" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0064E0" />
              <stop offset="100%" stopColor="#00A2FF" />
            </linearGradient>
          </defs>
          <rect width="48" height="48" rx="10" fill="url(#metaTile)" />
          <path
            fill="#fff"
            d="M12.7 30.9c0 2 .9 3.4 2.4 3.4 1.7 0 2.7-.8 4.7-4 0 0 1.3-2 2.2-3.6-1.5-2.4-2.7-4.2-3.4-5-1.6-1.9-2.9-2.8-4.3-2.8-3 0-5.2 3.7-5.2 8 0 2.6.8 4.9 2.3 6.4l1.6-1.6c-.6-.8-1-1.7-1-2.8 0-2.6 1.5-5.7 3.1-5.7 1.1 0 2 .6 3.1 2 .7.9 1.6 2.2 2.5 3.7l-1.1 1.7c-1.5 2.4-2.2 2.9-3.3 2.9-.7 0-1.3-.4-1.3-1.4 0-.6.1-1.2.2-1.7l-2 .4c-.3 1.1-.5 2.4-.5 3.2Zm10.2-4.2c1.4-2.3 3.3-5.3 3.3-5.3 1.4-2.2 2.4-3.1 3.7-3.1 1.5 0 2.7 1.1 3.7 3.3.9 2 1.4 4.4 1.4 6.7 0 4.1-1.8 5.4-3.4 5.4-1.3 0-2.3-.6-3.5-2.4l-1.4 2.1c1.4 1.9 2.9 3 5 3 3.4 0 5.7-2.9 5.7-8.2 0-5.3-2.6-10-6.2-10-2 0-3.6 1.1-5.1 3.1-1.1 1.4-2.4 3.5-3.4 5.2l-.5.8Z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <defs>
            <radialGradient id="igTile" cx="30%" cy="107%" r="140%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="10%" stopColor="#FFDD55" />
              <stop offset="45%" stopColor="#FF543E" />
              <stop offset="80%" stopColor="#C837AB" />
              <stop offset="100%" stopColor="#7638FA" />
            </radialGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#igTile)" />
          <rect x="10" y="10" width="28" height="28" rx="8" fill="none" stroke="#fff" strokeWidth="2.6" />
          <circle cx="24" cy="24" r="6.5" fill="none" stroke="#fff" strokeWidth="2.6" />
          <circle cx="32.5" cy="15.5" r="1.9" fill="#fff" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#1877F2" />
          <path
            fill="#fff"
            d="M31.5 30.9 32.6 24h-6.6v-4.5c0-1.9.9-3.7 3.9-3.7h3V10s-2.7-.5-5.3-.5c-5.4 0-9 3.3-9 9.2V24h-6v6.9h6V47.5c1.2.2 2.5.3 3.7.3s2.5-.1 3.7-.3V30.9h5.5Z"
          />
        </svg>
      );
    case "google":
      // Google "G" filling a white tile with its four brand colors.
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#fff" />
          <path
            fill="#4285F4"
            d="M39.6 24.4c0-1.1-.1-2.1-.3-3.1H24v6h8.8c-.4 2-1.6 3.7-3.3 4.9v4h5.3c3.1-2.9 4.8-7.1 4.8-11.8Z"
          />
          <path
            fill="#34A853"
            d="M24 40c4.3 0 8-1.4 10.7-3.9l-5.3-4c-1.5 1-3.3 1.6-5.4 1.6-4.2 0-7.7-2.8-8.9-6.6H9.7v4.1C12.4 36.6 17.8 40 24 40Z"
          />
          <path
            fill="#FBBC04"
            d="M15.1 27.1c-.3-.9-.5-1.9-.5-2.9s.2-2 .5-2.9v-4.1H9.7C8.6 19.3 8 21.6 8 24.2s.6 4.9 1.7 7l5.4-4.1Z"
          />
          <path
            fill="#EA4335"
            d="M24 15c2.4 0 4.5.8 6.2 2.4l4.6-4.6C31.9 10.2 28.2 8.6 24 8.6c-6.2 0-11.6 3.4-14.3 8.5l5.4 4.1c1.3-3.8 4.8-6.2 8.9-6.2Z"
          />
        </svg>
      );
    case "ga4":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#fff" />
          <rect x="30" y="8" width="10" height="32" rx="5" fill="#F9AB00" />
          <rect x="19" y="18" width="10" height="22" rx="5" fill="#E37400" />
          <circle cx="13" cy="35" r="5" fill="#E37400" />
        </svg>
      );
    case "gtm":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#fff" />
          <path fill="#8AB4F8" d="M27.7 42 6 20.3l6.6-6.6L34.4 35.4z" />
          <path fill="#4285F4" d="M27.8 6 42 20.2 22 40 7.7 25.8z" />
          <circle cx="14.4" cy="36" r="4.4" fill="#246FDB" />
        </svg>
      );
    case "searchconsole":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#fff" />
          <circle cx="20" cy="20" r="11" fill="none" stroke="#4285F4" strokeWidth="4" />
          <circle cx="20" cy="20" r="4.5" fill="#FBBC04" />
          <path stroke="#34A853" strokeWidth="4.5" strokeLinecap="round" d="m29 29 10 10" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden>
          <rect width="48" height="48" rx="10" fill="#010101" />
          <path
            fill="#25F4EE"
            d="M32.4 12h-4.9v20.6a4.6 4.6 0 1 1-4.6-4.6c.5 0 .9.1 1.4.2v-5a9.6 9.6 0 0 0-1.4-.1 9.6 9.6 0 1 0 9.6 9.6V20.4a11.3 11.3 0 0 0 6.6 2.1v-4.9a6.7 6.7 0 0 1-6.7-5.6Z"
          />
          <path
            fill="#FE2C55"
            d="M34 13.5h-4.9v20.6a4.6 4.6 0 1 1-4.6-4.6c.5 0 .9.1 1.4.2v-5a9.6 9.6 0 0 0-1.4-.1 9.6 9.6 0 1 0 9.6 9.6V21.9a11.3 11.3 0 0 0 6.6 2.1V19a6.7 6.7 0 0 1-6.7-5.5Z"
          />
          <path
            fill="#fff"
            d="M33.2 12.8h-4.9v20.6a4.6 4.6 0 1 1-4.6-4.6c.5 0 .9.1 1.4.2v-5a9.6 9.6 0 0 0-1.4-.1 9.6 9.6 0 1 0 9.6 9.6V21.2a11.3 11.3 0 0 0 6.6 2.1v-4.9a6.7 6.7 0 0 1-6.7-5.6Z"
          />
        </svg>
      );
  }
}
