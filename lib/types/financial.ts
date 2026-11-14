export type PaymentMethod = "card" | "pix" | "manual";
export type GatewayProvider = "infinitepay" | "mercadopago" | "manual";
export type BillingCycle = "monthly" | "yearly" | "one_time";
export type ComplianceStatus = "compliant" | "overdue" | "pending";
export type InvoiceStatus = "pending" | "paid" | "overdue" | "cancelled";

export type CustomerBillingSummary = {
  rider_id: string;
  user_id: string;
  tenant_id?: string;
  name: string;
  email: string;
  phone: string;
  registration_status: "active" | "inactive" | string;
  compliance_status: ComplianceStatus;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount_cents: number;
  allow_installments?: boolean;
  installments?: number;
  payment_method: PaymentMethod;
  gateway: GatewayProvider;
  last_paid_at?: string;
  last_paid_amount_cents?: number;
  next_due_date?: string;
};

export type ManagerCustomersBillingResponse = {
  total: number;
  compliant: number;
  overdue: number;
  pending: number;
  customers: CustomerBillingSummary[];
};

export type InvoiceItem = {
  id: string;
  tenant_id?: string;
  rider_id: string;
  user_id: string;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount_cents: number;
  allow_installments?: boolean;
  installments?: number;
  due_date: string;
  paid_at?: string;
  status: InvoiceStatus;
  payment_method: PaymentMethod;
  gateway_provider: GatewayProvider;
  gateway_external_id?: string;
  checkout_url?: string;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  card_brand?: string;
  card_last4?: string;
  notes?: string;
  created_at: string;
};

export type CustomerCurrentBillingResponse = {
  has_profile: boolean;
  plan_name: string;
  billing_cycle: BillingCycle;
  amount_cents: number;
  allow_installments?: boolean;
  installments?: number;
  payment_method: PaymentMethod;
  gateway: GatewayProvider;
  card_brand?: string;
  card_last4?: string;
  due_date: string;
  last_paid_at?: string;
  status: InvoiceStatus;
  compliance_status: ComplianceStatus;
  current_invoice?: InvoiceItem;
  history: InvoiceItem[];
  gateways_configured: Record<string, boolean>;
};

