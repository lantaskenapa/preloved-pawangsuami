import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className = 'w-9 h-9 sm:w-10 sm:h-10' }) => {
  return (
    <div className={`relative shrink-0 flex items-center justify-center rounded-xl bg-neutral-900 text-white shadow-xs overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full p-1"
      >
        {/* Background rounded base */}
        <rect width="48" height="48" rx="10" fill="#18181B" />

        {/* Monogram P & S Modern Emblem */}
        <path
          d="M14 12H24.5C28.0899 12 31 14.9101 31 18.5C31 22.0899 28.0899 25 24.5 25H14V12Z"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 12V36"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M20 25C21.5 29 24.5 36 31 36C34.5 36 36 33.5 36 31C36 27.5 31.5 26.5 27 25"
          stroke="#E4E4E7"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Orange Shopee accent jewel */}
        <circle cx="34.5" cy="13.5" r="2.2" fill="#EE4D2D" />
      </svg>
    </div>
  );
};
