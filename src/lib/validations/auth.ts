import { z } from "zod";

const email = z.string().min(1, "이메일을 입력해 주세요.").email("올바른 이메일 형식이 아닙니다.");
const password = z
  .string()
  .min(8, "비밀번호는 8자 이상이어야 합니다.")
  .max(72, "비밀번호가 너무 깁니다.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "비밀번호를 입력해 주세요."),
});

export const signUpSchema = z.object({
  companyName: z
    .string()
    .min(1, "업체명을 입력해 주세요.")
    .max(100, "업체명이 너무 깁니다."),
  email,
  password,
});

export const resetRequestSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "비밀번호 확인을 입력해 주세요."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "비밀번호가 일치하지 않습니다.",
    path: ["confirmPassword"],
  });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ResetRequestInput = z.infer<typeof resetRequestSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
