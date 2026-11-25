import { useId } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

export interface LogoProps {
  linkHome?: boolean;
  variant?: "full" | "icon";
  size?: "xs" | "sm" | "md" | "lg";
  tone?: "auto" | "light" | "dark" | "pill";
  showSubtitle?: boolean;
  className?: string;
}

const SIZE_CONFIG = {
  xs: { box: 26, titleClass: "text-base", subClass: "text-[9px]", gap: "gap-2" },
  sm: { box: 32, titleClass: "text-xl", subClass: "text-[9.5px]", gap: "gap-2.5" },
  md: { box: 42, titleClass: "text-2xl", subClass: "text-[10.5px]", gap: "gap-2.5" },
  lg: { box: 52, titleClass: "text-3xl", subClass: "text-xs", gap: "gap-3" },
} as const;

/**
 * Reusable AlgoLens "Algorithm Focus" circular emblem and wordmark component.
 * Uses flat 2D natural ocean/teal/amber/violet geometry that stays crisp at 16px+
 * and contrasts cleanly across both light frosted-glass headers and dark cards.
 */
export function Logo({
  linkHome = false,
  variant = "full",
  size = "sm",
  tone = "light",
  showSubtitle = false,
  className,
}: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const clipId = `algolens-clip-${uid}`;
  const titleId = `algolens-svg-title-${uid}`;
  const amberArcId = `algolens-amber-${uid}`;
  const violetArcId = `algolens-violet-${uid}`;

  const { box, titleClass, subClass, gap } = SIZE_CONFIG[size];
  const isDarkSurface = tone === "dark" || tone === "pill";

  const lockup = (
    <span
      className={cn(
        "inline-flex items-center select-none",
        gap,
        tone === "pill" &&
          "px-3 py-1.5 rounded-xl bg-[#102438]/90 backdrop-blur-md border border-[#235178]/70 shadow-sm",
        className
      )}
    >
      <svg
        width={box}
        height={box}
        viewBox="0 0 128 128"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-labelledby={titleId}
        className="shrink-0"
      >
        <title id={titleId}>AlgoLens — Algorithm Focus Emblem</title>
        <defs>
          <clipPath id={clipId}>
            <circle cx="64" cy="64" r="53" />
          </clipPath>
          <linearGradient id={amberArcId} x1="28" y1="98" x2="102" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#EE9A2C" />
            <stop offset="65%" stopColor="#D97458" />
            <stop offset="100%" stopColor="#9A4D86" />
          </linearGradient>
          <linearGradient id={violetArcId} x1="88" y1="24" x2="96" y2="102" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8E4884" />
            <stop offset="70%" stopColor="#B85F7A" />
            <stop offset="100%" stopColor="#EA8F32" />
          </linearGradient>
        </defs>

        {/* Deep Ocean Lens Shell */}
        <g>
          <circle cx="64" cy="64" r="60" fill="#102940" />
          <circle cx="64" cy="64" r="58.5" stroke="#235178" strokeWidth="2" />
          <circle cx="64" cy="64" r="46.5" fill="#13314C" stroke="#1B4469" strokeWidth="1.5" />
        </g>

        {/* Ascending Stepped Sorting Visualizer Blocks */}
        <g clipPath={`url(#${clipId})`}>
          <rect x="16" y="49" width="10" height="15" fill="#1B5585" />
          <rect x="26" y="42" width="10" height="22" fill="#1D6792" />
          <rect x="36" y="34" width="10" height="30" fill="#156E6B" />
          <rect x="46" y="26" width="11" height="38" fill="#1F867D" />
          <rect x="57" y="21" width="11" height="43" fill="#E69934" />
          <rect x="68" y="16" width="11" height="48" fill="#EF9A28" />
          <rect x="79" y="13" width="11" height="51" fill="#84427D" />
        </g>

        {/* Inner Shutter Aperture Hole */}
        <circle cx="64" cy="64" r="20" fill="#0E2235" stroke="#1E4B72" strokeWidth="1.5" />

        {/* Overlapping 2D Network Branches & Nodes */}
        <g clipPath={`url(#${clipId})`}>
          <path d="M44 76 L58 106" stroke="#8E4884" strokeOpacity="0.82" strokeWidth="4" strokeLinecap="round" />
          <path
            d="M37 86 L55 96 L73 82 L89 94 L103 77 L93 58"
            stroke="#218B7F"
            strokeOpacity="0.78"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M89 94 L83 68"
            stroke="#218B7F"
            strokeOpacity="0.65"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="37" cy="86" r="3.4" fill="#2CA394" fillOpacity="0.9" />
          <circle cx="55" cy="96" r="3.6" fill="#218B7F" fillOpacity="0.95" />
          <circle cx="73" cy="82" r="3.8" fill="#36A899" fillOpacity="0.92" />
          <circle cx="89" cy="94" r="3.4" fill="#218B7F" fillOpacity="0.95" />
          <circle cx="103" cy="77" r="3.2" fill="#36A899" fillOpacity="0.9" />

          <path
            d="M21 67 L35 68 L42 90 L56 93 L71 102 L83 81 L96 76 L91 61"
            stroke="#EE9A2C"
            strokeWidth="3.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M56 93 L83 81"
            stroke="#F5AE42"
            strokeOpacity="0.72"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <circle cx="21" cy="67" r="4" fill="#F5AE42" />
          <circle cx="35" cy="68" r="4.2" fill="#EE9A2C" />
          <circle cx="42" cy="90" r="3.8" fill="#F5AE42" />
          <circle cx="56" cy="93" r="4.2" fill="#EE9A2C" />
          <circle cx="71" cy="102" r="3.8" fill="#F5AE42" />
          <circle cx="83" cy="81" r="4.2" fill="#EE9A2C" />
          <circle cx="96" cy="76" r="3.8" fill="#F5AE42" />
          <circle cx="91" cy="61" r="3.6" fill="#F8C978" />
        </g>

        {/* Path-Finding Perimeter Loops & Arrowheads */}
        <g>
          <path
            d="M96 29 A46 46 0 0 1 94 100"
            stroke={`url(#${violetArcId})`}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <polygon points="89,100 100,96 94,107" fill="#EA8F32" />
          <path
            d="M30 98 A48 48 0 0 0 92 103"
            stroke={`url(#${amberArcId})`}
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <polygon points="34,92 25,96 34,104" fill="#9A4D86" />
        </g>
      </svg>

      {variant === "full" && (
        <span className="flex flex-col leading-none">
          <span
            className={cn(
              "font-extrabold tracking-tight font-sans leading-none",
              titleClass,
              isDarkSurface ? "text-[#F4F5F7]" : "text-[#102940]"
            )}
          >
            Algo
            <span className="bg-gradient-to-r from-[#F6AE44] to-[#E27C22] bg-clip-text text-transparent">
              Lens
            </span>
          </span>
          {showSubtitle && (
            <span
              className={cn(
                "font-medium tracking-wider mt-0.5 leading-none",
                subClass,
                isDarkSurface ? "text-[#CBD5E1]" : "text-slate-600"
              )}
            >
              Interactive DSA Platform
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (linkHome) {
    return (
      <Link
        to="/"
        aria-label="AlgoLens Home — Interactive DSA Platform"
        title="AlgoLens — Interactive DSA Platform"
        className="inline-flex items-center group cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        {lockup}
      </Link>
    );
  }

  return lockup;
}
