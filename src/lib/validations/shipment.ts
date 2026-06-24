import { z } from "zod";

import { CURRENCIES, INCOTERMS } from "@/lib/constants/trade";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const shipmentSchema = z.object({
  ref_no: z
    .string()
    .trim()
    .min(1, "수출건 번호(Ref No)를 입력해 주세요.")
    .max(60, "번호가 너무 깁니다."),
  buyer_id: z
    .string()
    .uuid("바이어를 선택해 주세요.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  incoterms: z.enum(INCOTERMS).optional().or(z.literal("").transform(() => undefined)),
  currency: z.enum(CURRENCIES).default("USD"),
  port_of_loading: optionalText(120),
  port_of_discharge: optionalText(120),
  // <input type="date"> → "YYYY-MM-DD" or empty
  etd: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  lc_no: optionalText(80),
  memo: optionalText(2000),
});

export type ShipmentInput = z.infer<typeof shipmentSchema>;
