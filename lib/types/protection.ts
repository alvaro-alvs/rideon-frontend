export type CommandType =
  | "cut_fuel"
  | "restore_fuel"
  | "set_interval"
  | "get_status"
  | "reboot"
  | "set_server"
  | "custom"
  | "raw_hex";

export type CommandStatus =
  | "pending"
  | "sent"
  | "acked"
  | "failed"
  | "timeout"
  | "blocked_by_safety";

export interface DeviceCommandItem {
  id: string;
  tenant_id?: string;
  motorcycle_id: string;
  device_id: string;
  imei: string;
  protocol: string;
  type: CommandType;
  status: CommandStatus;
  payload?: Record<string, unknown>;
  command_text?: string;
  encoded_hex?: string;
  server_flag?: number;
  response_text?: string;
  response_hex?: string;
  error?: string;
  requested_by: string;
  requested_role?: string;
  reason?: string;
  speed_at_send?: number;
  force_moving?: boolean;
  created_at: string;
  sent_at?: string;
  acked_at?: string;
  updated_at: string;
}

export interface CommandAuditItem {
  id: string;
  command_id: string;
  motorcycle_id: string;
  imei: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  command_type: CommandType;
  encoded_hex?: string;
  source_ip?: string;
  details?: string;
  created_at: string;
}

export type GeofenceShape = "circle" | "polygon";
export type GeofenceKind = "anchor" | "safe_zone" | "restricted_zone" | "checkpoint";
export type GeofenceTrigger = "enter" | "exit" | "both";

export interface LatLngPoint {
  latitude: number;
  longitude: number;
}

export interface GeofenceSchedule {
  enabled: boolean;
  days_of_week?: number[];
  start_time?: string;
  end_time?: string;
  timezone?: string;
}

export interface GeofenceItem {
  id: string;
  tenant_id?: string;
  motorcycle_id: string;
  name: string;
  description?: string;
  kind: GeofenceKind;
  shape: GeofenceShape;
  center?: LatLngPoint;
  radius_meters?: number;
  polygon?: LatLngPoint[];
  trigger_on: GeofenceTrigger;
  alert_severity: string;
  color?: string;
  schedule?: GeofenceSchedule;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GeofenceEventItem {
  id: string;
  geofence_id: string;
  geofence_name: string;
  geofence_kind: GeofenceKind;
  motorcycle_id: string;
  imei?: string;
  event_type: "enter" | "exit";
  latitude: number;
  longitude: number;
  speed: number;
  ignition?: boolean;
  dwell_seconds?: number;
  alert_id?: string;
  occurred_at: string;
}

export interface GeofenceAuditItem {
  id: string;
  geofence_id: string;
  motorcycle_id: string;
  actor_id?: string;
  actor_role?: string;
  action: string;
  details?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface ShareLinkItem {
  id: string;
  motorcycle_id: string;
  token_preview?: string;
  label?: string;
  show_plate: boolean;
  show_speed: boolean;
  show_recent_path: boolean;
  expires_at: string;
  revoked_at?: string;
  access_count: number;
  last_accessed_at?: string;
  created_at: string;
}

export interface PublicShareSnapshot {
  label?: string;
  expires_at: string;
  brand?: {
    brand_name: string;
    logo_url?: string;
    primary_color?: string;
  };
  vehicle: {
    brand: string;
    model: string;
    year?: number;
    color?: string;
    license_plate?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    ignition?: boolean;
    timestamp: string;
  };
  recent_path?: LatLngPoint[];
  updated_at: string;
}
