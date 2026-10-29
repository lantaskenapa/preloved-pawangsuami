import React from 'react';

interface BrandLogoProps {
  className?: string;
  variant?: 'banner' | 'icon';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = 'h-9 w-auto',
  variant = 'banner'
}) => {
  if (variant === 'icon') {
    return (
      <img
        src="/assets/aistudio/navbar-01_ab3651e0.png"
        alt="Pawang Suami"
        className={`object-contain ${className}`}
      />
    );
  }

  return (
    <img
      src="/assets/aistudio/logopawang-01_d93a2394.png"
      alt="Pawang Suami Preloved"
      className={`object-contain ${className}`}
    />
  );
};
