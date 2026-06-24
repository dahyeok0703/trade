import { z } from "zod";

// ~512 KB of base64 — keeps branding images small (stored in exporter_info jsonb).
const MAX_IMAGE_CHARS = 700_000;

const imageDataUrl = z
  .string()
  .trim()
  .refine(
    (v) => v === "" || (v.startsWith("data:image/") && v.length <= MAX_IMAGE_CHARS),
    "이미지는 PNG/JPEG이며 약 500KB 이하여야 합니다.",
  );

/** Exporter info shown on documents (English) + optional logo/signature. */
export const exporterInfoSchema = z.object({
  company_en: z.string().trim().max(200),
  address_en: z.string().trim().max(500),
  tel: z.string().trim().max(60),
  email: z
    .string()
    .trim()
    .max(200)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "이메일 형식이 올바르지 않습니다."),
  logo: imageDataUrl,
  signature: imageDataUrl,
});

export type ExporterInfoInput = z.infer<typeof exporterInfoSchema>;
