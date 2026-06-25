"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const NAVY = "#17304d";
const TEAL = "#0d9488";

const fmt = (v: number) => v.toLocaleString("en-US");

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export function ByBuyerChart({ data }: { data: { name: string; amount: number }[] }) {
  if (data.length === 0) return <EmptyChart label="수출 데이터가 아직 없습니다." />;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tickFormatter={fmt} fontSize={11} stroke="#9ca3af" />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            fontSize={11}
            stroke="#6b7280"
            tickLine={false}
          />
          <Tooltip formatter={(value) => fmt(Number(value))} cursor={{ fill: "#f3f4f6" }} />
          <Bar dataKey="amount" fill={TEAL} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ByMonthChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) return <EmptyChart label="ETD가 입력된 수출 데이터가 없습니다." />;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="month" fontSize={11} stroke="#6b7280" tickLine={false} />
          <YAxis tickFormatter={fmt} fontSize={11} stroke="#9ca3af" width={56} />
          <Tooltip formatter={(value) => fmt(Number(value))} cursor={{ fill: "#f3f4f6" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? TEAL : NAVY} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
