/**
 * Shape real do dispositivo retornado por GET /api/v1/devices?motorcycle_id={id}
 * conforme README_ADMIN.md § 4.2
 */
export type RawDevice = {
  id: string;
  motorcycle_id: string;
  serial_number: string;
  protocol?: string;
  firmware_version?: string;
  status: "active" | "inactive" | string;
  last_seen_at?: string | null;
  created_at: string;
};

/**
 * Shape real da posição retornada por GET /api/v1/motorcycles/:id/location
 * conforme use-motorcycle-location.ts existente
 */
export type DeviceLastPosition = {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  address?: string;
  timestamp: string; // ISO date
};

export type AssociatedMotorcycle = {
  id: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  chassis?: string;
  rider?: {
    id?: string;
    name: string;
    phone: string;
    email?: string;
  };
};

/**
 * Tipo composto utilizado pela view de admin.
 * É montado pelo BFF a partir de 3 chamadas ao backend:
 *   1. GET /api/v1/motorcycles (sem rider_id → todas as motos)
 *   2. GET /api/v1/devices?motorcycle_id={id}
 *   3. GET /api/v1/motorcycles/{id}/location (para last_position)
 */
export type Device = {
  id: string;           // device id
  serial_number: string;
  protocol?: string;
  firmware_version?: string;
  status: "active" | "inactive";
  last_seen_at?: string | null;
  last_position?: DeviceLastPosition | null;
  motorcycle?: AssociatedMotorcycle | null;
  created_at: string;
};

export type AdminDevicesResponse = {
  devices: Device[];
  total: number;
  active_count: number;
  inactive_count: number;
  unlinked_count: number;
};

export type CreateDevicePayload = {
  serial_number: string;
  motorcycle_id?: string | null;
  protocol?: string;
  firmware_version?: string;
  status?: "active" | "inactive";
  model_name?: string;
  notes?: string;
};

export type DeviceModelPreset = {
  id: string;
  name: string;
  category: "4g" | "2g" | "hybrid" | "custom";
  defaultProtocol: string;
  defaultFirmware: string;
  badge: string;
  description: string;
  voltageRange: string;
  features: string[];
};

