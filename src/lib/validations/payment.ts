import { z } from "zod";

const dateOpt = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.")
  .optional()
  .or(z.literal("").transform(() => undefined));

/* Server canonical — coerces strings from the form. */
const base = {
  term: z.enum(["TT", "LC"]),
  amount: z.coerce.number().finite("금액이 올바르지 않습니다.").nonnegative("0 이상이어야 합니다.").default(0),
  due_on: dateOpt,
  paid_on: dateOpt,
  status: z.enum(["pending", "partial", "paid"]).default("pending"),
};

export const paymentSchema = z.object({ shipment_id: z.string().uuid(), ...base });
export const updatePaymentSchema = z.object({ id: z.string().uuid(), ...base });

export type PaymentInput = z.infer<typeof paymentSchema>;

/* Client form — string fields for clean react-hook-form typing. */
const amountString = z
  .string()
  .trim()
  .superRefine((val, ctx) => {
    if (val === "") {
      ctx.addIssue({ code: "custom", message: "금액을 입력해 주세요." });
      return;
    }
    const n = Number(val);
    if (Number.isNaN(n) || !Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message: "금액은 숫자여야 합니다." });
    } else if (n < 0) {
      ctx.addIssue({ code: "custom", message: "금액은 0 이상이어야 합니다." });
    }
  });

export const paymentFormSchema = z.object({
  term: z.enum(["TT", "LC"]),
  amount: amountString,
  due_on: z.string(),
  paid_on: z.string(),
  status: z.enum(["pending", "partial", "paid"]),
});

export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
