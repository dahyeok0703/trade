"use server";

import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ensureWorkspace } from "@/lib/auth/bootstrap";
import { action, ActionError } from "@/lib/actions/safe-action";
import {
  resetRequestSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/validations/auth";

export const signInAction = action(signInSchema, async ({ email, password }) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new ActionError("이메일 또는 비밀번호가 올바르지 않습니다.", "INVALID_CREDENTIALS");
  }
  // Workspace may not exist yet if sign-up used email confirmation.
  await ensureWorkspace();
  revalidatePath("/", "layout");
  return { redirectTo: "/dashboard" };
});

export const signUpAction = action(signUpSchema, async ({ companyName, email, password }) => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { company_name: companyName },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.message.includes("already")) {
      throw new ActionError("이미 가입된 이메일입니다.", "USER_EXISTS");
    }
    throw new ActionError("회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.", "SIGNUP_FAILED");
  }

  // When email confirmation is disabled (e.g. local dev) a session is returned
  // immediately, so we can create the workspace now.
  const needsConfirmation = !data.session;
  if (!needsConfirmation) {
    await ensureWorkspace(companyName);
    revalidatePath("/", "layout");
  }

  return { needsConfirmation, redirectTo: needsConfirmation ? null : "/dashboard" };
});

export const requestPasswordResetAction = action(resetRequestSchema, async ({ email }) => {
  const supabase = await createClient();
  // Always resolve as success to avoid leaking which emails are registered.
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/update-password`,
  });
  return { sent: true };
});

export const updatePasswordAction = action(updatePasswordSchema, async ({ password }) => {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    throw new ActionError("비밀번호를 변경하지 못했습니다.", "UPDATE_FAILED");
  }
  return { redirectTo: "/dashboard" };
});
