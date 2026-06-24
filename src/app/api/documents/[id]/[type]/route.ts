import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getActiveMembership } from "@/lib/auth/session";
import { renderShipmentPdf, isDocSlug } from "@/lib/documents/pdf-render";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> },
) {
  const { id, type } = await params;

  if (!isDocSlug(type)) {
    return NextResponse.json({ error: "알 수 없는 서류 종류입니다." }, { status: 404 });
  }

  // Auth — RLS scopes the shipment lookup to the caller's workspace.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const member = await getActiveMembership(user.id);
  if (!member) return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });

  const rendered = await renderShipmentPdf(id, type);
  if (!rendered) {
    return NextResponse.json({ error: "수출건을 찾을 수 없습니다." }, { status: 404 });
  }

  const download = req.nextUrl.searchParams.get("dl") === "1";
  return new NextResponse(new Uint8Array(rendered.buffer), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${rendered.filename}"`,
      "cache-control": "private, no-store",
    },
  });
}
