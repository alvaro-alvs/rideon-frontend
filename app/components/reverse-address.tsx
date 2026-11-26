"use client";

import { useReverseGeocode } from "@/hooks/use-reverse-geocode";

interface ReverseAddressProps {
  latitude?: number | null;
  longitude?: number | null;
  existingAddress?: string | null;
  loadingText?: string;
  fallbackText?: string;
  className?: string;
}

export function ReverseAddress({
  latitude,
  longitude,
  existingAddress,
  loadingText = "Buscando endereço...",
  fallbackText = "Endereço não identificado",
  className,
}: ReverseAddressProps) {
  const { address, loading } = useReverseGeocode(
    latitude,
    longitude,
    existingAddress,
  );

  const text = address || (loading ? loadingText : fallbackText);

  return (
    <span className={className} title={address ?? undefined}>
      {text}
    </span>
  );
}
