"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { authedAction, ActionError } from "@/lib/actions/safe-action";
import { logAudit } from "@/lib/audit";
import { getDocMeta } from "@/lib/documents/pdf-render";
import type { Json } from "@/lib/supabase/database.types";

const issueSchema = z.object({
  shipmentId: z.string().uuid(),
  slug: z.enum(["invoice", "packing-list", "certificate-of-origin"]),
});

/**
 * Records a document issuance in `trade_documents` (history): doc_no, issued_on
 * and a full data_snapshot of the document model. The PDF itself is generated
 * on demand from `/api/documents/...`; file_path stays null.
 */
export const issueDocumentAction = authedAction(issueSchema, async ({ shipmentId, slug }, ctx) => {
  const meta = await getDocMeta(shipmentId, slug);
  if (!meta) throw new ActionError("수출건을 찾을 수 없습니다.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trade_documents")
    .insert({
      workspace_id: ctx.workspaceId,
      shipment_id: shipmentId,
      doc_type: meta.docType,
      doc_no: meta.docNo,
      issued_on: new Date().toISOString().slice(0, 10),
      data_snapshot: meta.snapshot as unknown as Json,
      file_path: null,
    })
    .select("id")
    .single();

  if (error || !data) throw new ActionError("발행 이력을 저장하지 못했습니다.");

  await logAudit({
    workspaceId: ctx.workspaceId,
    actorMemberId: ctx.member.id,
    action: "document.issued",
    targetTable: "trade_documents",
    targetId: data.id,
    meta: { doc_no: meta.docNo, doc_type: meta.docType },
  });

  revalidatePath(`/shipments/${shipmentId}`);
  return { id: data.id, docNo: meta.docNo };
});
