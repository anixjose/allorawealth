export const BRAND_NAME = 'Allora Wealth';
export const BRAND_TAGLINE = 'Your Investment Partner. Together, We Build Wealth.';

/** Animated logo, looping silently like a static image would — no controls, no sound. */
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <video
      className={`shrink-0 rounded-md object-contain ${className}`}
      src="/logo.mp4"
      autoPlay
      loop
      muted
      playsInline
      disablePictureInPicture
      aria-hidden="true"
    />
  );
}

/**
 * `sm` for the persistent nav header; `lg` for the auth pages' first impression.
 * `inverse` renders white text for use on the dark emerald sidebar.
 */
export function Brand({ size = 'sm', inverse = false }: { size?: 'sm' | 'lg'; inverse?: boolean }) {
  const nameColor = inverse ? 'text-white' : 'text-emerald-deep';
  const taglineColor = inverse ? 'text-white/60' : 'text-gray-400';

  if (size === 'lg') {
    return (
      <div className="flex items-center gap-3">
        <LogoMark className="h-20 w-20" />
        <div>
          <h1 className={`text-2xl font-bold font-serif ${nameColor}`}>{BRAND_NAME}</h1>
          <p className={`mt-1 text-sm ${inverse ? 'text-white/70' : 'text-gray-500'}`}>{BRAND_TAGLINE}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <LogoMark className="h-11 w-11" />
      <div className="leading-tight">
        <div className={`text-base font-semibold font-serif ${nameColor}`}>{BRAND_NAME}</div>
        <div className={`text-[11px] ${taglineColor}`}>{BRAND_TAGLINE}</div>
      </div>
    </div>
  );
}
