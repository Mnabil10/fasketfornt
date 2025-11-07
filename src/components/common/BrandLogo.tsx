import React from "react";
import logoSrc from "../../assets/1.png";

type Props = {
  className?: string;
  alt?: string;
  size?: number; // square size in px
};

export function BrandLogo({ className = "", alt = "Logo", size = 36 }: Props) {
  return (
    <img
      src={logoSrc}
      alt={alt}
      width={size}
      height={size}
      className={className || `w-[${size}px] h-[${size}px] object-contain`}
    />
  );
}

export default BrandLogo;

