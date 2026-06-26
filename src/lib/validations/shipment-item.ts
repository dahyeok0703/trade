import { z } from "zod";

/* ─────────────────────────────────────────────────────────────────────────────
 * Shipment line item — the single source of truth for both the Commercial
 * Invoice (amount-centric) and Packing List (qty/weight/volume-centric).
 *
 * Server canonical schema: coerces strings from the form. `amount` is NOT
 * accepted from the client — it is always recomputed server-side as
 * qty × unit_price so invoice figures cannot drift from the inputs.
 * ──────────────────────────────────────────────────────────────────────────── */

const num = (v: unknown) => (v === "" || v === null || v === undefined ? undefined : v);

const optionalNonNeg = z.preprocess(
  num,
  z.coerce.number().finite("숫자가 올바르지 않습니다.").nonnegative("0 이상이어야 합니다.").optional(),
);

const optionalInt = z.preprocess(
  num,
  z.coerce.number().int("정수를 입력해 주세요.").nonnegative("0 이상이어야 합니다.").optional(),
);

const baseItem = {
  product_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  description_en: z.string().trim().min(1, "품명을 입력해 주세요.").max(300),
  hs_code: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(20).optional(),
  ),
  unit: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(20).default("EA"),
  ),
  qty: z.coerce.number().finite("수량이 올바르지 않습니다.").nonnegative("0 이상이어야 합니다."),
  unit_price: z.coerce
    .number()
    .finite("단가가 올바르지 않습니다.")
    .nonnegative("0 이상이어야 합니다.")
    .default(0),
  net_weight: optionalNonNeg,
  gross_weight: optionalNonNeg,
  ctns: optionalInt,
  cbm: optionalNonNeg,
  // The buyer's original wording for this line (from an order/AI draft, or the
  // picked product name). Not stored on the row — used only to learn a
  // buyer→product alias on save. Optional and capped.
  source_text: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(300).optional(),
  ),
};

export const shipmentItemSchema = z.object({
  shipment_id: z.string().uuid(),
  ...baseItem,
});

export const updateShipmentItemSchema = z.object({
  id: z.string().uuid(),
  ...baseItem,
});

/** Bulk insert (e.g. applying reviewed AI-extracted order items). */
export const bulkShipmentItemsSchema = z.object({
  shipment_id: z.string().uuid(),
  /** Buyer to attribute learned aliases to (optional; falls back to shipment). */
  buyer_id: z
    .string()
    .uuid()
    .optional()
    .or(z.literal("").transform(() => undefined)),
  items: z.array(z.object(baseItem)).min(1, "추가할 품목이 없습니다.").max(200),
});

export type ShipmentItemInput = z.infer<typeof shipmentItemSchema>;

/* Client form schema — all-string fields for clean react-hook-form typing. */

const numericString = (label: string, opts: { required?: boolean; integer?: boolean } = {}) =>
  z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val === "") {
        if (opts.required) ctx.addIssue({ code: "custom", message: `${label}을(를) 입력해 주세요.` });
        return;
      }
      const n = Number(val);
      if (Number.isNaN(n) || !Number.isFinite(n)) {
        ctx.addIssue({ code: "custom", message: `${label}은(는) 숫자여야 합니다.` });
      } else if (n < 0) {
        ctx.addIssue({ code: "custom", message: `${label}은(는) 0 이상이어야 합니다.` });
      } else if (opts.integer && !Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: `${label}은(는) 정수여야 합니다.` });
      }
    });

export const shipmentItemFormSchema = z.object({
  product_id: z.string(),
  description_en: z.string().trim().min(1, "품명을 입력해 주세요.").max(300),
  hs_code: z.string().trim().max(20),
  unit: z.string().trim().min(1, "단위를 입력해 주세요.").max(20),
  qty: numericString("수량", { required: true }),
  unit_price: numericString("단가", { required: true }),
  net_weight: numericString("순중량"),
  gross_weight: numericString("총중량"),
  ctns: numericString("박스수", { integer: true }),
  cbm: numericString("용적(CBM)"),
});

export type ShipmentItemFormValues = z.infer<typeof shipmentItemFormSchema>;
