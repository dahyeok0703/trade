"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileSpreadsheet, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PRODUCT_COLUMNS,
  PRODUCT_EXPORT_FILENAME,
  PRODUCT_TEMPLATE_FILENAME,
} from "@/lib/constants/products";
import { exportProductsAction, importProductsAction } from "@/lib/actions/products";

const HEADERS = PRODUCT_COLUMNS.map((c) => c.header);

export function ProductsExcelToolbar() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "import" | "export" | "template">(null);

  async function downloadTemplate() {
    setBusy("template");
    try {
      const XLSX = await import("xlsx");
      const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      XLSX.writeFile(wb, PRODUCT_TEMPLATE_FILENAME);
    } catch {
      toast.error("양식을 생성하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function exportProducts() {
    setBusy("export");
    try {
      const result = await exportProductsAction({});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const XLSX = await import("xlsx");
      const rows = result.data.rows;
      const ws =
        rows.length > 0
          ? XLSX.utils.json_to_sheet(rows, { header: HEADERS })
          : XLSX.utils.aoa_to_sheet([HEADERS]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Products");
      XLSX.writeFile(wb, PRODUCT_EXPORT_FILENAME);
      toast.success(`${rows.length}개 제품을 내보냈습니다.`);
    } catch {
      toast.error("내보내기에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    setBusy("import");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const sheetName = wb.SheetNames[0];
      const sheet = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!sheet) throw new Error("empty");
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

      // Map spreadsheet headers → product field keys.
      const rows = raw.map((r) => {
        const mapped: Record<string, unknown> = {};
        for (const col of PRODUCT_COLUMNS) mapped[col.key] = r[col.header] ?? "";
        return mapped;
      });

      if (rows.length === 0) {
        toast.error("가져올 데이터가 없습니다. 양식을 확인해 주세요.");
        return;
      }

      const result = await importProductsAction({ rows });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { inserted, skipped } = result.data;
      if (inserted > 0) {
        toast.success(`${inserted}개 등록${skipped ? `, ${skipped}개 건너뜀` : ""}`);
      } else {
        toast.error(`등록된 행이 없습니다. (${skipped}개 건너뜀)`);
      }
      router.refresh();
    } catch {
      toast.error("엑셀 파일을 읽지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onFile}
      />
      <Button variant="ghost" size="sm" onClick={downloadTemplate} disabled={busy !== null}>
        {busy === "template" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        엑셀 양식
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={busy !== null}
      >
        {busy === "import" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        가져오기
      </Button>
      <Button variant="outline" size="sm" onClick={exportProducts} disabled={busy !== null}>
        {busy === "export" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        내보내기
      </Button>
    </div>
  );
}
