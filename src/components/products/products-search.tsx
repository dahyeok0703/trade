"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

export function ProductsSearch({ origins }: { origins: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: URLSearchParams) {
    startTransition(() => router.replace(`/products?${next.toString()}`));
  }

  useEffect(() => {
    const handle = setTimeout(() => {
      const current = params.get("q") ?? "";
      if (value === current) return;
      const next = new URLSearchParams(params);
      if (value) next.set("q", value);
      else next.delete("q");
      pushParams(next);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function onOriginChange(origin: string) {
    const next = new URLSearchParams(params);
    if (origin === ALL) next.delete("origin");
    else next.set("origin", origin);
    pushParams(next);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="품명·HS코드·원산지 검색"
          className="pl-9"
          aria-label="제품 검색"
        />
      </div>
      <Select value={params.get("origin") ?? ALL} onValueChange={onOriginChange}>
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="원산지" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>전체 원산지</SelectItem>
          {origins.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
