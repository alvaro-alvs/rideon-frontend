export type AlertCategory = "ignition" | "alert" | "telemetry";

export interface HistoryAlertLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface HistoryAlertItem {
  id: string;
  tenant_id?: string;
  motorcycle_id?: string;
  rider_id?: string;
  device_id?: string;
  imei?: string;
  vehicle_model?: string;
  vehicle_plate?: string;
  type: string;
  severity: "info" | "warning" | "critical" | string;
  status: string;
  message: string;
  source?: string;
  location?: HistoryAlertLocation;
  read?: boolean;
  created_at: string;
}

export interface AlertMeta {
  title: string;
  category: AlertCategory;
}

const ALERT_META_MAP: Record<string, AlertMeta> = {
  ignition_on: { title: "Ignição Ligada", category: "ignition" },
  ignition_off: { title: "Ignição Desligada", category: "ignition" },
  illegal_ignition: { title: "Alerta de Partida Indevida", category: "ignition" },

  speeding: { title: "Excesso de Velocidade", category: "alert" },
  power_cut: { title: "Cabo de Bateria Cortado", category: "alert" },
  vibration_shock: { title: "Vibração Suspeita", category: "alert" },
  illegal_displacement: { title: "Deslocamento Sem Ignição", category: "alert" },
  towing: { title: "Possível Guincho / Reboque", category: "alert" },
  sos: { title: "Botão de Pânico / SOS", category: "alert" },
  possible_crash: { title: "Possível Colisão Detectada", category: "alert" },
  tamper: { title: "Violação do Rastreador", category: "alert" },
  fall_down: { title: "Queda da Motocicleta", category: "alert" },
  hard_braking: { title: "Frenagem Brusca", category: "alert" },
  hard_acceleration: { title: "Aceleração Brusca", category: "alert" },
  harsh_cornering: { title: "Curva Brusca", category: "alert" },
  door_open: { title: "Abertura de Baú / Compartimento", category: "alert" },

  geofence_enter: { title: "Entrada em Cerca Virtual", category: "telemetry" },
  geofence_exit: { title: "Saída de Cerca Virtual", category: "telemetry" },
  low_battery: { title: "Bateria do Rastreador Fraca", category: "telemetry" },
  low_external_power: { title: "Bateria da Moto Fraca", category: "telemetry" },
  gps_blind_enter: { title: "Entrada em Ponto Cego GPS", category: "telemetry" },
  gps_blind_exit: { title: "Saída de Ponto Cego GPS", category: "telemetry" },
  power_off: { title: "Rastreador Desligado", category: "telemetry" },
  vehicle_stopped: { title: "Veículo Parado • Trajeto Salvo", category: "telemetry" },
};

const SUPPRESSED_TYPES = new Set([
  "unknown_hardware_alarm",
  "unknown",
  "heartbeat",
  "heartbeat_2",
  "normal",
]);

export function isRelevantHistoryAlert(item: Partial<HistoryAlertItem>): boolean {
  const t = (item.type || "").trim().toLowerCase();
  if (!t || SUPPRESSED_TYPES.has(t)) return false;

  const msg = (item.message || "").toLowerCase();
  if (
    msg.includes("código 0x00") ||
    msg.includes("code 0x00") ||
    msg.includes("firmware variant") ||
    msg.includes("heartbeat")
  ) {
    return false;
  }

  return Boolean(ALERT_META_MAP[t] || item.message);
}

export function getHistoryAlertMeta(item: Partial<HistoryAlertItem>): AlertMeta {
  const t = (item.type || "").trim().toLowerCase();
  if (ALERT_META_MAP[t]) {
    return ALERT_META_MAP[t];
  }
  return {
    title: item.message ? item.message.split(":")[0] : "Evento do Veículo",
    category: "alert",
  };
}
