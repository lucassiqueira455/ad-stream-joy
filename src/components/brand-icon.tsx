import type { PlatformKey } from "./platform-chip";

/**
 * High-fidelity platform marks sized to fill a square avatar tile.
 * The SVG viewBox is always 48×48 so cards/chips can render edge-to-edge.
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
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#0467DF" />
          <path
            fill="#FFFFFF"
            d="M13.83 12.06c-3.94 0-7.37 2.56-9.75 6.23C1.41 22.42 0 27.77 0 32.9c0 1.41.14 2.74.42 3.95.15.64.33 1.22.53 1.72.22.55.47 1.06.74 1.52 1.4 2.32 3.64 3.85 7.19 3.85 2.99 0 5.27-1.34 7.93-4.88 1.52-2.02 2.29-3.25 5.33-8.64l1.51-2.68.37-.65.37.6 4.3 7.19c1.45 2.42 3.33 5.11 4.94 6.63 2.09 1.97 3.98 2.44 6.12 2.44 2.15 0 3.75-.71 4.91-1.69.68-.57 1.22-1.23 1.62-1.94 1.08-1.88 1.72-4.25 1.72-7.49 0-5.44-1.36-10.71-4.17-14.9-2.56-3.82-5.91-5.86-9.43-5.86-2.09 0-4.18.93-6.11 2.62-1.3 1.14-2.51 2.58-3.64 4.1-1.38-1.75-2.67-3.09-3.92-4.11-2.36-1.93-4.63-2.61-6.91-2.61Zm20.32 4.11c2.29 0 4.38 1.52 5.98 4 2.26 3.5 3.29 8.39 3.29 12.8 0 3.1-.74 5.8-3.68 5.8-1.16 0-2.05-.46-3.33-2.01-.99-1.2-2.69-3.76-5.66-8.72l-1.23-2.06a89.8 89.8 0 0 0-2.51-3.96l.42-.65c2.24-3.42 4.3-5.2 6.72-5.2Zm-20.51.25c1.38 0 2.54.48 3.78 1.5 1.02.84 2.1 2.01 3.35 3.65-.82 1.25-1.6 2.56-2.37 3.88l-1.47 2.54c-2.42 4.16-3.64 6.01-4.68 7.26-1.56 1.88-2.66 2.46-3.93 2.46-1.44 0-2.28-.55-2.82-1.45-.7-1.17-1.04-2.92-1.04-5.18 0-4.1 1.15-8.51 3.2-11.61 1.65-2.49 3.69-3.55 5.98-3.55Z"
            transform="scale(.88) translate(3.3 0)"
          />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#FFFFFF" />
          <path
            fill="#4285F4"
            d="M29.2 6.5c2.35-1.36 5.35-.55 6.71 1.8L46 25.78c1.36 2.36.55 5.36-1.8 6.72-2.36 1.36-5.36.55-6.72-1.8L27.39 13.22c-1.36-2.35-.55-5.36 1.81-6.72Z"
          />
          <path
            fill="#34A853"
            d="M18.85 17.05 7.8 36.2a4.9 4.9 0 0 1-8.49-4.9L12.22 8.95a4.9 4.9 0 0 1 8.49 4.9l-1.86 3.2Z"
            transform="translate(2.7 1.4)"
          />
          <circle cx="12.1" cy="37.8" r="8.1" fill="#FBBC04" />
          <path
            fill="#1A73E8"
            d="M29.2 6.5c2.35-1.36 5.35-.55 6.71 1.8L46 25.78c1.36 2.36.55 5.36-1.8 6.72-2.36 1.36-5.36.55-6.72-1.8L27.39 13.22c-1.36-2.35-.55-5.36 1.81-6.72Z"
            opacity=".95"
          />
        </svg>
      );
    case "gtm":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#FFFFFF" />
          <path
            fill="#4285F4"
            d="M24 3.2a6 6 0 0 0-4.24 10.24l13.73 13.73-8.89 9.08 3.49 3.67c.55.47 1.02.96 1.4 1.48l.02.02v.01c.76 1.08 1.22 2.4 1.22 3.91 0 .53-.06 1.05-.18 1.56l15.5-15.29c.06-.06.14-.1.2-.16.05-.05.08-.11.12-.15a5.99 5.99 0 0 0-.12-8.33l-18-18A5.98 5.98 0 0 0 24 3.2Z"
          />
          <path
            fill="#8AB4F8"
            d="M17.25 7.47 1.76 22.82a6 6 0 0 0 0 8.48l15.4 15.5a6.86 6.86 0 0 1-.16-1.46 6.86 6.86 0 0 1 6.86-6.86c.58 0 1.13.07 1.65.2L14.47 27.06l8.74-8.75-4.16-4.16a5.93 5.93 0 0 1-1.8-6.68Z"
          />
          <circle cx="23.86" cy="45.34" r="5.86" fill="#246FDB" />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <defs>
            <radialGradient id="brand-ig-a" cx="31%" cy="108%" r="140%">
              <stop offset="0%" stopColor="#FFDD55" />
              <stop offset="12%" stopColor="#FFDD55" />
              <stop offset="45%" stopColor="#FF543E" />
              <stop offset="78%" stopColor="#C837AB" />
              <stop offset="100%" stopColor="#7638FA" />
            </radialGradient>
          </defs>
          <rect width="48" height="48" rx="12" fill="url(#brand-ig-a)" />
          <rect x="10" y="10" width="28" height="28" rx="8" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="24" cy="24" r="7" fill="none" stroke="#FFFFFF" strokeWidth="3" />
          <circle cx="32.6" cy="15.4" r="2.1" fill="#FFFFFF" />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#1877F2" />
          <path
            fill="#FFFFFF"
            d="M31.2 31.1 32.3 24h-6.8v-4.6c0-1.95.96-3.86 4.03-3.86h3.1V9.5s-2.82-.48-5.5-.48c-5.6 0-9.27 3.4-9.27 9.55V24h-6.23v7.1h6.23v16.36a24.5 24.5 0 0 0 7.64 0V31.1h5.7Z"
          />
        </svg>
      );
    case "ga4":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#FFFFFF" />
          <rect x="30" y="7" width="11" height="34" rx="5.5" fill="#F9AB00" />
          <rect x="18" y="17" width="11" height="24" rx="5.5" fill="#E37400" />
          <circle cx="12.5" cy="35.5" r="5.5" fill="#E37400" />
        </svg>
      );
    case "searchconsole":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#FFFFFF" />
          <path d="M10 13h28a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V16a3 3 0 0 1 3-3Z" fill="#4285F4" />
          <path d="M7 18h34v18a3 3 0 0 1-3 3H10a3 3 0 0 1-3-3V18Z" fill="#FFFFFF" />
          <path d="M14 31.5h6l3-8 4 13 3-8h4" fill="none" stroke="#34A853" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
          <circle cx="14" cy="15.5" r="1.4" fill="#FFFFFF" />
          <circle cx="19" cy="15.5" r="1.4" fill="#FFFFFF" />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
          <rect width="48" height="48" rx="12" fill="#010101" />
          <path fill="#25F4EE" d="M31.8 9h-5.3v22.1a5 5 0 1 1-5-5c.54 0 .98.1 1.5.22v-5.4a10.4 10.4 0 0 0-1.5-.1 10.3 10.3 0 1 0 10.3 10.3V18.05a12.1 12.1 0 0 0 7.1 2.25v-5.25A7.2 7.2 0 0 1 31.8 9Z" />
          <path fill="#FE2C55" d="M33.4 10.6h-5.3v22.1a5 5 0 1 1-5-5c.54 0 .98.1 1.5.22v-5.4a10.4 10.4 0 0 0-1.5-.1 10.3 10.3 0 1 0 10.3 10.3V19.65a12.1 12.1 0 0 0 7.1 2.25v-5.25a7.2 7.2 0 0 1-7.1-6.05Z" />
          <path fill="#FFFFFF" d="M32.6 9.8h-5.3v22.1a5 5 0 1 1-5-5c.54 0 .98.1 1.5.22v-5.4a10.4 10.4 0 0 0-1.5-.1 10.3 10.3 0 1 0 10.3 10.3V18.85a12.1 12.1 0 0 0 7.1 2.25v-5.25a7.2 7.2 0 0 1-7.1-6.05Z" />
        </svg>
      );
  }
}