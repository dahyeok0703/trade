"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { productSchema, productImportSchema, type ProductInput } from "@/lib/validations/product";
import { PRODUCT_COLUMNS } from "@/lib/constants/products";

const idSchema = z.object({ id: z.string().uuid() });
const updateProductSchema = productSchema.extend({ id: z.string().uuid() });

function toRow(input: ProductInput) {
  return {
    name_en: input.name_en,
    hs_code: input.hs_code ?? null,
    unit: input.unit,
    unit_price_usd: input.unit_price_usd,
    net_weight: input.net_weight ?? null,
    gross_weight: input.gross_weight ?? null,
    dimensions: input.dimensions ?? null,
    origin_country: input.origin_country ?? null,
  };
}

export const createProductAction = authedAction(productSchema, async (input, ctx) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({ workspace_id: ctx.workspaceId, ...toRow(input) })
    .select("id")
    .single();

  if (error || !data) throw new ActionError("제품을 등록하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "product.created",
    targetTable: "products",
    targetId: data.id,
    meta: { name_en: input.name_en },
  });

  revalidatePath("/products");
  return { id: data.id };
});

export const updateProductAction = authedAction(updateProductSchema, async (input, ctx) => {
  const supabase = await createClient();
  const { id, ...rest } = input;
  const { error } = await supabase
    .from("products")
    .update(toRow(rest))
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ActionError("제품을 수정하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "product.updated",
    targetTable: "products",
    targetId: id,
  });

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { id };
});

export const deleteProductAction = authedAction(idSchema, async ({ id }, ctx) => {
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new ActionError("제품을 삭제하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "product.deleted",
    targetTable: "products",
    targetId: id,
  });

  revalidatePath("/products");
  return { id };
});

/**
 * Bulk import from Excel. Each row arrives already keyed by product field
 * (mapped client-side from the spreadsheet headers). Invalid rows are skipped
 * and reported rather than failing the whole import.
 */
export const importProductsAction = authedAction(productImportSchema, async ({ rows }, ctx) => {
  const valid: ReturnType<typeof toRow>[] = [];
  const errors: { row: number; message: string }[] = [];

  rows.forEach((raw, i) => {
    const parsed = productSchema.safeParse(raw);
    if (parsed.success) {
      valid.push(toRow(parsed.data));
    } else {
      errors.push({
        row: i + 2, // +1 header, +1 to 1-based
        message: parsed.error.issues[0]?.message ?? "유효하지 않은 행",
      });
    }
  });

  let inserted = 0;
  if (valid.length > 0) {
    const supabase = await createClient();
    const { error, count } = await supabase
      .from("products")
      .insert(valid.map((r) => ({ workspace_id: ctx.workspaceId, ...r })), { count: "exact" });
    if (error) throw new ActionError("엑셀 일괄 등록에 실패했습니다.");
    inserted = count ?? valid.length;

    await logAudit({
      workspaceId: ctx.workspaceId,
      actorMemberId: ctx.member.id,
      action: "product.imported",
      targetTable: "products",
      meta: { inserted, skipped: errors.length },
    });
  }

  revalidatePath("/products");
  return { inserted, skipped: errors.length, errors: errors.slice(0, 20) };
});

/** Returns export rows keyed by the spreadsheet headers (for SheetJS). */
export const exportProductsAction = authedAction(z.object({}), async (_input) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .order("name_en", { ascending: true });
  if (error) throw new ActionError("제품을 불러오지 못했습니다.");

  const rows = (data ?? []).map((p) =>
    Object.fromEntries(
      PRODUCT_COLUMNS.map((c) => [c.header, p[c.key] ?? ""]),
    ),
  );
  return { rows };
});
