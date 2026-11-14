/**
 * Shape real do dispositivo retornado por GET /api/v1/devices?motorcycle_id={id}
 * conforme README_ADMIN.md § 4.2
 */
export type RawDevice = {
  id: string;
  tenant_id?: string | null;
  manager_id?: string | null;
  manager_email?: string;
  motorcycle_id?: string | null;
  serial_number: string;
  protocol?: string;
  firmware_version?: string;
  status: "active" | "inactive" | "standby" | "provisioned" | string;
  discovered_via_broker?: boolean;
  last_source_ip?: string;
  last_seen_at?: string | null;
  has_position?: boolean;
  last_position?: DeviceLastPosition | null;
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
 * É montado pelo BFF a partir de chamadas ao backend:
 *   1. GET /api/v1/devices
 *   2. GET /api/v1/devices/{id}/location ou GET /api/v1/motorcycles/{id}/location
 *   3. GET /api/v1/motorcycles/{id}
 */
export type Device = {
  id: string;           // device id
  tenant_id?: string | null;
  manager_id?: string | null;
  manager_email?: string;
  serial_number: string;
  protocol?: string;
  firmware_version?: string;
  status: "active" | "inactive" | "standby" | "provisioned" | string;
  discovered_via_broker?: boolean;
  last_source_ip?: string;
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
  broker_count?: number;
  pending_transfer_count?: number;
};

export type DeviceAudit = {
  id: string;
  device_id: string;
  serial_number: string;
  tenant_id?: string | null;
  manager_id?: string | null;
  event_type:
    | "broker_discovered"
    | "broker_login"
    | "broker_offline"
    | "broker_telemetry"
    | "transferred_to_manager"
    | "registered"
    | "updated"
    | string;
  protocol?: string;
  source_ip?: string;
  status?: string;
  actor_id?: string | null;
  actor_email?: string;
  actor_role?: string;
  details?: string;
  metadata?: Record<string, string>;
  created_at: string;
};

export type DeviceAuditListResponse = {
  data: DeviceAudit[];
  total: number;
  limit: number;
  offset: number;
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

