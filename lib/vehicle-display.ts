export type VehicleDisplayFields = {
  brand?: string | null;
  model?: string | null;
  nickname?: string | null;
};

/** Returns the combined brand and model label without applying any nickname override. */
export function formatVehicleModel(vehicle?: VehicleDisplayFields | null): string {
  if (!vehicle) return "Veículo";
  const brand = (vehicle.brand ?? "").trim();
  const model = (vehicle.model ?? "").trim();
  if (brand && model) {
    if (model.toLowerCase().startsWith(brand.toLowerCase())) {
      return model;
    }
    return `${brand} ${model}`;
  }
  return brand || model || "Veículo";
}

/**
 * Returns the custom vehicle nickname when present, otherwise falling back to brand + model.
 */
export function formatVehicleDisplayName(vehicle?: VehicleDisplayFields | null): string {
  if (!vehicle) return "Veículo";
  const nickname = (vehicle.nickname ?? "").trim();
  if (nickname) return nickname;
  return formatVehicleModel(vehicle);
}
