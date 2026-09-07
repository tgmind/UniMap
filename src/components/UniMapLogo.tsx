import React from 'react';

interface UniMapLogoProps {
  className?: string;
  size?: number;
  withBackground?: boolean;
}

export const UniMapLogo: React.FC<UniMapLogoProps> = ({
  className = 'w-8 h-8',
  size = 32,
  withBackground = true,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Facet 1: Indigo to Royal Blue */}
        <linearGradient id="unimap-grad-1" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>

        {/* Facet 2: Royal Blue to Radiant Cyan */}
        <linearGradient id="unimap-grad-2" x1="80" y1="20" x2="20" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>

        {/* Facet 3: Cyan to Emerald Teal */}
        <linearGradient id="unimap-grad-3" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Squircle Dark Glow Filter */}
        <radialGradient id="unimap-bg-glow" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E2433" />
          <stop offset="100%" stopColor="#0B0D14" />
        </radialGradient>
      </defs>

      {/* Optional Sleek Squircle Container */}
      {withBackground && (
        <>
          <rect
            x="2"
            y="2"
            width="96"
            height="96"
            rx="26"
            fill="url(#unimap-bg-glow)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.5"
          />
          {/* Subtle top rim highlight */}
          <path
            d="M 28 3.5 L 72 3.5"
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </>
      )}

      {/* Isometric Quantum Nexus Glyph */}
      <g transform="translate(0, 0)">
        {/* Top Facet */}
        <path
          d="M 50 20 L 78 36 L 50 52 L 22 36 Z"
          fill="url(#unimap-grad-1)"
          opacity="0.95"
        />

        {/* Right Facet */}
        <path
          d="M 78 36 L 78 68 L 50 84 L 50 52 Z"
          fill="url(#unimap-grad-2)"
          opacity="0.9"
        />

        {/* Left Facet */}
        <path
          d="M 22 36 L 50 52 L 50 84 L 22 68 Z"
          fill="url(#unimap-grad-3)"
          opacity="0.85"
        />

        {/* Inner Nexus Dynamic Center Node */}
        <circle cx="50" cy="52" r="5.5" fill="#FFFFFF" opacity="0.95" />
        <circle cx="50" cy="52" r="2.5" fill="#3B82F6" />
      </g>
    </svg>
  );
};
export const WhiteVaultLogo = UniMapLogo;
export default WhiteVaultLogo;
