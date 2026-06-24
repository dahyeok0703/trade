import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const buyerSchema = z.object({
  name_en: z
    .string()
    .trim()
    .min(1, "영문 상호를 입력해 주세요.")
    .max(200, "상호가 너무 깁니다."),
  address_en: optionalText(500),
  country: optionalText(100),
  contact: z.object({
    person: optionalText(100),
    email: z
      .string()
      .trim()
      .max(200)
      .email("올바른 이메일 형식이 아닙니다.")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    tel: optionalText(50),
  }),
  notify_party: z.object({
    name: optionalText(200),
    address: optionalText(500),
  }),
});

export type BuyerInput = z.infer<typeof buyerSchema>;

/** Shape stored in `buyers.contact` / `buyers.notify_party` jsonb columns. */
export type BuyerContact = { person?: string; email?: string; tel?: string };
export type NotifyParty = { name?: string; address?: string };
