export type Manager = {
  id: string;
  tenant_id?: string;
  tenant_name?: string;
  tenant_slug?: string;
  email: string;
  role: string;
  status: string;
  device_count: number;
  customer_count: number;
  motorcycle_count: number;
  created_at: string;
};
