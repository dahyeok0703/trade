"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { buyerSchema } from "@/lib/validations/buyer";

const idSchema = z.object({ id: z.string().uuid() });
const updateBuyerSchema = buyerSchema.extend({ id: z.string().uuid() });

export const createBuyerAction = authedAction(buyerSchema, async (input, ctx) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("buyers")
    .insert({
      workspace_id: ctx.workspaceId,
      name_en: input.name_en,
      address_en: input.address_en ?? null,
      country: input.country ?? null,
      contact: input.contact,
      notify_party: input.notify_party,
    })
    .select("id")
    .single();

  if (error || !data) throw new ActionError("바이어를 등록하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "buyer.created",
    targetTable: "buyers",
    targetId: data.id,
    meta: { name_en: input.name_en },
  });

  revalidatePath("/buyers");
  return { id: data.id };
});

export const updateBuyerAction = authedAction(updateBuyerSchema, async (input, ctx) => {
  const supabase = await createClient();
  const { id, ...fields } = input;
  const { error } = await supabase
    .from("buyers")
    .update({
      name_en: fields.name_en,
      address_en: fields.address_en ?? null,
      country: fields.country ?? null,
      contact: fields.contact,
      notify_party: fields.notify_party,
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ActionError("바이어 정보를 수정하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "buyer.updated",
    targetTable: "buyers",
    targetId: id,
  });

  revalidatePath("/buyers");
  revalidatePath(`/buyers/${id}`);
  return { id };
});

export const deleteBuyerAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("buyers")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ActionError("바이어를 삭제하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "buyer.deleted",
    targetTable: "buyers",
    targetId: id,
  });

  revalidatePath("/buyers");
  return { id };
});
