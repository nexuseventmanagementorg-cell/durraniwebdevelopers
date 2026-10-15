export const MANUAL_PAYMENT_METHODS = [
  "JazzCash",
  "Easypaisa",
  "Bank Transfer",
] as const;

export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export interface PaymentSettings {
  accountHolder: string;
  walletNumber: string;
  bankName: string;
  accountNumber: string;
  iban: string;
  branch: string;
  jazzcashEnabled: boolean;
  easypaisaEnabled: boolean;
  bankTransferEnabled: boolean;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  accountHolder: "",
  walletNumber: "",
  bankName: "",
  accountNumber: "",
  iban: "",
  branch: "",
  jazzcashEnabled: true,
  easypaisaEnabled: true,
  bankTransferEnabled: true,
};

export interface PaymentProof {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  inquiry_reference: string | null;
  method: ManualPaymentMethod;
  amount: number;
  currency: "PKR";
  transaction_reference: string;
  storage_path: string;
  status: "pending" | "verified" | "rejected";
  admin_note: string | null;
  created_at: string;
  verified_at: string | null;
  receipt_url?: string;
}
