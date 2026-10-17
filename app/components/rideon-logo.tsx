"use client";

import { useState } from "react";
import Link from "next/link";
import { useTenant } from "@/app/components/tenant-provider";

type RideOnLogoProps = {
  compact?: boolean;
  href?: string;
};

export function RideOnLogo({ compact = false, href }: RideOnLogoProps) {
  const { branding } = useTenant();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const brandName = branding.brand_name || "RideOn";
  const initial = brandName.charAt(0).toUpperCase();

  const isRideOn = brandName.toLowerCase() === "rideon";
  const imgError = Boolean(branding.logo_url && failedUrl === branding.logo_url);

  // Highlight effect: split the brand name if possible or display as is
  let firstPart = brandName;
  let secondPart = "";
  if (isRideOn) {
    firstPart = "RIDE";
    secondPart = "ON";
  } else if (brandName.length > 4) {
    const splitIndex = Math.floor(brandName.length / 2);
    firstPart = brandName.slice(0, splitIndex);
    secondPart = brandName.slice(splitIndex);
  }

  // Use custom partner image ONLY if explicitly configured, not failing, and not rideon base
  const hasCustomImage = Boolean(
    branding.logo_url &&
    branding.logo_url.trim() !== "" &&
    branding.logo_url !== "/logo.svg" &&
    !imgError &&
    !isRideOn
  );

  const mark = (
    <span
      className="inline-flex items-center gap-2.5 text-xl font-black italic leading-none tracking-[0.04em] text-foreground"
      aria-label={brandName}
    >
      {hasCustomImage ? (
        // Custom Partner Logo Image
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logo_url}
          alt={brandName}
          className="h-8 max-h-8 w-auto object-contain"
          onError={() => setFailedUrl(branding.logo_url || null)}
        />
      ) : (
        // Styled Brand Initial Badge (RideOn original red square with 'R')
        <span className="grid size-7 place-items-center rounded-sm bg-primary text-sm font-black not-italic text-primary-foreground shadow-sm shadow-primary/20">
          {initial}
        </span>
      )}
      {!compact && (
        <span className="uppercase">
          {firstPart}
          {secondPart && <span className="text-primary">{secondPart}</span>}
        </span>
      )}
    </span>
  );

  return href ? <Link href={href}>{mark}</Link> : mark;
}

export const TenantLogo = RideOnLogo;

