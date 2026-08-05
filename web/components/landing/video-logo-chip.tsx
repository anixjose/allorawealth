import { LogoMark } from '../brand';

/**
 * The uploaded logo video has an opaque white background (MP4 has no alpha
 * channel), so on this page's dark navy background it needs a light chip
 * behind it rather than sitting directly on the dark bg — otherwise it reads
 * as a stray white box instead of an intentional logo mark.
 */
export function VideoLogoChip({ className = 'h-11 w-11' }: { className?: string }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ${className}`}>
      <LogoMark className="h-full w-full" />
    </div>
  );
}
