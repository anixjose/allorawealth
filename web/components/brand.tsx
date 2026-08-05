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

/** `sm` for the persistent nav header; `lg` for the auth pages' first impression. */
export function Brand({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  if (size === 'lg') {
    return (
      <div className="flex items-center gap-3">
        <LogoMark className="h-20 w-20" />
        <div>
          <h1 className="text-2xl font-bold text-brand-700">{BRAND_NAME}</h1>
          <p className="mt-1 text-sm text-gray-500">{BRAND_TAGLINE}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <LogoMark className="h-11 w-11" />
      <div className="leading-tight">
        <div className="text-base font-semibold text-brand-700">{BRAND_NAME}</div>
        <div className="text-[11px] text-gray-400">{BRAND_TAGLINE}</div>
      </div>
    </div>
  );
}
