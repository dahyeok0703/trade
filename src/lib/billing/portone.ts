import "server-only";

import crypto from "node:crypto";

import type {
  BillingAdapter,
  BillingKeyInfo,
  ChargeArgs,
  ChargeResult,
  ScheduleArgs,
  WebhookVerifyArgs,
} from "@/lib/billing/types";

const BASE_URL = "https://api.portone.io";

/**
 * PortOne V2 adapter. REST calls are encapsulated here so the rest of the app
 * stays provider-agnostic. All network calls are defensive (never throw to the
 * caller — return ok:false), since billing must fail safe.
 */
export class PortOneAdapter implements BillingAdapter {
  readonly provider = "portone";

  constructor(
    private readonly apiSecret: string,
    private readonly webhookSecret?: string,
  ) {}

  private headers() {
    return {
      Authorization: `PortOne ${this.apiSecret}`,
      "Content-Type": "application/json",
    };
  }

  async payWithBillingKey(args: ChargeArgs): Promise<ChargeResult> {
    try {
      const res = await fetch(
        `${BASE_URL}/payments/${encodeURIComponent(args.paymentId)}/billing-key`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            billingKey: args.billingKey,
            orderName: args.orderName,
            customer: args.customer,
            amount: { total: args.amount },
            currency: args.currency,
          }),
        },
      );
      const raw = await res.json().catch(() => ({}));
      return { ok: res.ok, status: res.ok ? "PAID" : "FAILED", raw };
    } catch (err) {
      return { ok: false, status: "ERROR", raw: { error: String(err) } };
    }
  }

  async scheduleNextPayment(args: ScheduleArgs): Promise<{ ok: boolean; raw: unknown }> {
    try {
      const res = await fetch(
        `${BASE_URL}/payments/${encodeURIComponent(args.paymentId)}/schedule`,
        {
          method: "POST",
          headers: this.headers(),
          body: JSON.stringify({
            payment: {
              billingKey: args.billingKey,
              orderName: args.orderName,
              customer: args.customer,
              amount: { total: args.amount },
              currency: args.currency,
            },
            timeToPay: args.timeToPay,
          }),
        },
      );
      const raw = await res.json().catch(() => ({}));
      return { ok: res.ok, raw };
    } catch (err) {
      return { ok: false, raw: { error: String(err) } };
    }
  }

  async getBillingKeyInfo(billingKey: string): Promise<BillingKeyInfo | null> {
    try {
      const res = await fetch(`${BASE_URL}/billing-keys/${encodeURIComponent(billingKey)}`, {
        headers: this.headers(),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        methods?: { card?: { publisher?: string; brand?: string; number?: string } }[];
      };
      const card = data.methods?.[0]?.card;
      const number = card?.number ?? "";
      return {
        cardBrand: card?.brand ?? card?.publisher,
        cardLast4: number ? number.replace(/\D/g, "").slice(-4) : undefined,
      };
    } catch {
      return null;
    }
  }

  async deleteBillingKey(billingKey: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/billing-keys/${encodeURIComponent(billingKey)}`, {
        method: "DELETE",
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Standard Webhooks verification (PortOne V2 uses this scheme). */
  verifyWebhook({ payload, headers }: WebhookVerifyArgs): boolean {
    if (!this.webhookSecret) return false;
    const id = headers["webhook-id"];
    const timestamp = headers["webhook-timestamp"];
    const signatureHeader = headers["webhook-signature"];
    if (!id || !timestamp || !signatureHeader) return false;

    const secretBytes = Buffer.from(this.webhookSecret.replace(/^whsec_/, ""), "base64");
    const signed = `${id}.${timestamp}.${payload}`;
    const expected = crypto.createHmac("sha256", secretBytes).update(signed).digest("base64");

    // Header is a space-separated list of "v1,<base64sig>" entries.
    const candidates = signatureHeader
      .split(" ")
      .map((part) => (part.includes(",") ? part.slice(part.indexOf(",") + 1) : part));

    return candidates.some((sig) => safeEqual(sig, expected));
  }
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
