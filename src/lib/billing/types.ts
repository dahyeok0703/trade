/**
 * Provider-agnostic billing adapter. The app talks only to this interface;
 * PortOne is one implementation. Swap providers by adding another adapter.
 */

export type ChargeArgs = {
  billingKey: string;
  paymentId: string;
  orderName: string;
  amount: number;
  currency: string;
  customer?: { id?: string; name?: string; email?: string };
};

export type ChargeResult = { ok: boolean; status: string; raw: unknown };

export type ScheduleArgs = ChargeArgs & { timeToPay: string };

export type BillingKeyInfo = { cardBrand?: string; cardLast4?: string };

export type WebhookVerifyArgs = {
  payload: string;
  headers: Record<string, string | undefined>;
};

export interface BillingAdapter {
  readonly provider: string;
  /** Charge a stored billing key immediately (first period / retry). */
  payWithBillingKey(args: ChargeArgs): Promise<ChargeResult>;
  /** Schedule the next recurring charge. */
  scheduleNextPayment(args: ScheduleArgs): Promise<{ ok: boolean; raw: unknown }>;
  /** Look up card metadata for a billing key. */
  getBillingKeyInfo(billingKey: string): Promise<BillingKeyInfo | null>;
  /** Revoke a billing key (on cancellation). */
  deleteBillingKey(billingKey: string): Promise<boolean>;
  /** Verify an incoming webhook signature (Standard Webhooks). */
  verifyWebhook(args: WebhookVerifyArgs): boolean;
}
