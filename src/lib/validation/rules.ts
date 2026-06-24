import type { Buyer, Shipment, ShipmentItem, Workspace } from "@/lib/supabase/database.types";

/**
 * Rule-based consistency engine — NO AI.
 *
 * The Commercial Invoice and Packing List are generated from the same
 * shipment_items, so cross-document arithmetic is consistent by construction.
 * What actually causes customs delays is missing or internally inconsistent
 * DATA (missing weights/CTNS, gross < net, no HS code, missing parties). This
 * engine checks all of that deterministically before the documents go out.
 */

export type Severity = "error" | "warning";

export type CheckResult = {
  id: string;
  label: string;
  severity: Severity;
  passed: boolean;
  /** What's wrong and how to fix it (shown on failure). */
  detail?: string;
};

export type ValidationSummary = {
  total: number;
  passedCount: number;
  errors: number;
  warnings: number;
};

export type ValidationReport = {
  /** True when there are no error-severity failures (warnings allowed). */
  passed: boolean;
  checks: CheckResult[];
  summary: ValidationSummary;
  version: number;
};

export type ValidationInputs = {
  workspace: Workspace;
  shipment: Shipment;
  buyer: Buyer | null;
  items: ShipmentItem[];
};

const REPORT_VERSION = 1;
const EPS = 0.005;

function num(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}
function round2(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Short, human-friendly list of offending item descriptions. */
function names(items: ShipmentItem[]): string {
  const list = items.map((i) => i.description_en || "(이름 없음)");
  if (list.length <= 3) return list.join(", ");
  return `${list.slice(0, 3).join(", ")} 외 ${list.length - 3}건`;
}

export function runValidation(input: ValidationInputs): ValidationReport {
  const { workspace, shipment, buyer, items } = input;
  const checks: CheckResult[] = [];
  const exporter = (workspace.exporter_info ?? {}) as Record<string, string>;

  const totalQty = items.reduce((s, i) => s + num(i.qty), 0);
  const totalAmount = round2(items.reduce((s, i) => s + num(i.amount), 0));
  const totalNet = round2(items.reduce((s, i) => s + num(i.net_weight), 0));
  const totalGross = round2(items.reduce((s, i) => s + num(i.gross_weight), 0));
  const totalCtns = items.reduce((s, i) => s + num(i.ctns), 0);
  const totalCbm = round2(items.reduce((s, i) => s + num(i.cbm), 0));

  // ── 1. Has line items ───────────────────────────────────────────────────────
  checks.push({
    id: "items_present",
    label: "품목 존재",
    severity: "error",
    passed: items.length > 0,
    detail: items.length === 0 ? "품목을 1개 이상 추가하세요." : undefined,
  });

  // No items → the rest can't be meaningfully evaluated.
  if (items.length === 0) {
    return finalize(checks);
  }

  // ── 2. Parties / header completeness ────────────────────────────────────────
  checks.push({
    id: "shipper_info",
    label: "Shipper(수출자) 정보",
    severity: "error",
    passed: Boolean(exporter.company_en && exporter.address_en),
    detail: !(exporter.company_en && exporter.address_en)
      ? "설정 > 워크스페이스의 수출자 영문 상호·주소(exporter_info)를 입력하세요."
      : undefined,
  });

  checks.push({
    id: "consignee_info",
    label: "Consignee(바이어) 정보",
    severity: "error",
    passed: Boolean(buyer && buyer.name_en && buyer.address_en),
    detail: !(buyer && buyer.name_en && buyer.address_en)
      ? "바이어를 연결하고 영문 상호·주소를 입력하세요."
      : undefined,
  });

  checks.push({
    id: "notify_party",
    label: "Notify Party",
    severity: "warning",
    passed: Boolean(buyer),
    detail: buyer
      ? "통지처 미입력 시 바이어와 동일(Same as consignee)으로 출력됩니다."
      : "바이어를 연결하면 통지처가 자동 처리됩니다.",
  });

  checks.push({
    id: "incoterms",
    label: "인코텀즈",
    severity: "error",
    passed: Boolean(shipment.incoterms),
    detail: !shipment.incoterms ? "인코텀즈(FOB/CIF 등)를 입력하세요." : undefined,
  });

  checks.push({
    id: "ports",
    label: "선적항/도착항",
    severity: "warning",
    passed: Boolean(shipment.port_of_loading && shipment.port_of_discharge),
    detail: !(shipment.port_of_loading && shipment.port_of_discharge)
      ? "선적항(POL)·도착항(POD)을 입력하세요."
      : undefined,
  });

  // ── 3. Invoice arithmetic ───────────────────────────────────────────────────
  const amountDrift = items.filter(
    (i) => Math.abs(round2(num(i.amount) - num(i.qty) * num(i.unit_price)) ) > EPS,
  );
  checks.push({
    id: "line_amount_integrity",
    label: "라인 금액 = 수량 × 단가",
    severity: "error",
    passed: amountDrift.length === 0,
    detail: amountDrift.length
      ? `금액이 수량×단가와 다른 품목: ${names(amountDrift)}. 해당 품목을 다시 저장하세요.`
      : undefined,
  });

  // Invoice total equals the sum of lines (structural — same source).
  checks.push({
    id: "invoice_total",
    label: `인보이스 총액 = 라인 합계 (${totalAmount.toLocaleString()} ${shipment.currency})`,
    severity: "warning",
    passed: true,
    detail: "동일 품목 데이터 기반이라 인보이스 총액과 라인 합계가 항상 일치합니다.",
  });

  // ── 4. Invoice ↔ Packing quantity consistency (structural) ─────────────────
  checks.push({
    id: "qty_consistency",
    label: `총 수량 일치 (인보이스 ↔ 패킹리스트: ${totalQty.toLocaleString()})`,
    severity: "warning",
    passed: true,
    detail: "두 서류 모두 동일한 품목 수량을 사용합니다.",
  });

  // ── 5. Packing list: weights ────────────────────────────────────────────────
  const noNet = items.filter((i) => i.net_weight == null);
  checks.push({
    id: "net_weight_present",
    label: "순중량 입력",
    severity: "error",
    passed: noNet.length === 0,
    detail: noNet.length ? `순중량이 비어 있는 품목: ${names(noNet)}.` : undefined,
  });

  const noGross = items.filter((i) => i.gross_weight == null);
  checks.push({
    id: "gross_weight_present",
    label: "총중량 입력",
    severity: "error",
    passed: noGross.length === 0,
    detail: noGross.length ? `총중량이 비어 있는 품목: ${names(noGross)}.` : undefined,
  });

  const grossLtNet = items.filter(
    (i) => i.net_weight != null && i.gross_weight != null && num(i.gross_weight) < num(i.net_weight),
  );
  checks.push({
    id: "gross_ge_net",
    label: "총중량 ≥ 순중량",
    severity: "error",
    passed: grossLtNet.length === 0,
    detail: grossLtNet.length
      ? `총중량이 순중량보다 작은 품목: ${names(grossLtNet)}. 중량을 확인하세요.`
      : undefined,
  });

  checks.push({
    id: "weight_totals",
    label: `총 순중량/총중량 (${totalNet.toLocaleString()} / ${totalGross.toLocaleString()} kg)`,
    severity: "warning",
    passed: totalNet > 0 && totalGross > 0,
    detail: !(totalNet > 0 && totalGross > 0) ? "중량 합계가 0입니다. 품목 중량을 입력하세요." : undefined,
  });

  // ── 6. Packing list: CTNS / CBM ─────────────────────────────────────────────
  const noCtns = items.filter((i) => i.ctns == null);
  checks.push({
    id: "ctns_present",
    label: "박스수(CTNS) 입력",
    severity: "error",
    passed: noCtns.length === 0 && totalCtns > 0,
    detail:
      noCtns.length > 0
        ? `박스수가 비어 있는 품목: ${names(noCtns)}.`
        : totalCtns === 0
          ? "총 박스수가 0입니다. CTNS를 입력하세요."
          : undefined,
  });

  const noCbm = items.filter((i) => i.cbm == null);
  checks.push({
    id: "cbm_present",
    label: `용적(CBM) 입력 (합계 ${totalCbm.toLocaleString()})`,
    severity: "warning",
    passed: noCbm.length === 0 && totalCbm > 0,
    detail:
      noCbm.length > 0
        ? `용적(CBM)이 비어 있는 품목: ${names(noCbm)}. B/L에 필요할 수 있습니다.`
        : totalCbm === 0
          ? "총 용적(CBM)이 0입니다."
          : undefined,
  });

  // ── 7. HS code / origin (참고용 — 관세사 영역) ─────────────────────────────
  const noHs = items.filter((i) => !i.hs_code);
  checks.push({
    id: "hs_code_present",
    label: "HS코드 입력 (참고용)",
    severity: "warning",
    passed: noHs.length === 0,
    detail: noHs.length
      ? `HS코드 미입력 품목: ${names(noHs)}. HS코드·통관 분류는 관세사 확인이 필요합니다.`
      : undefined,
  });

  const noOrigin = items.filter((i) => !i.product_id);
  checks.push({
    id: "origin_resolvable",
    label: "원산지 확인(제품마스터 연결)",
    severity: "warning",
    passed: noOrigin.length === 0,
    detail: noOrigin.length
      ? `제품마스터와 연결되지 않아 원산지 확인이 어려운 품목: ${names(noOrigin)}.`
      : undefined,
  });

  return finalize(checks);
}

function finalize(checks: CheckResult[]): ValidationReport {
  const errors = checks.filter((c) => !c.passed && c.severity === "error").length;
  const warnings = checks.filter((c) => !c.passed && c.severity === "warning").length;
  const passedCount = checks.filter((c) => c.passed).length;
  return {
    passed: errors === 0,
    checks,
    summary: { total: checks.length, passedCount, errors, warnings },
    version: REPORT_VERSION,
  };
}
