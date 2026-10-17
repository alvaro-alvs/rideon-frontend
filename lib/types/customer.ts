export type CustomerMotorcycle = {
  id: string;
  tenant_id?: string;
  rider_id: string;
  rider_name?: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  license_plate: string;
  status: string;
  device?: {
    id: string;
    serial_number: string;
    protocol: string;
    status: string;
    last_seen_at?: string;
  };
  created_at: string;
};

export type Customer = {
  id: string; // Rider ID
  user_id: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  manager_id?: string;
  manager_name?: string;
  manager_email?: string;
  name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  status: string;
  motorcycle_count: number;
  motorcycles: CustomerMotorcycle[];
  created_at: string;
};
