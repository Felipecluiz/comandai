import type { DashboardDto, DashboardPeriod } from "@comandai/contracts";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { adminApi } from "../../shared/api/http";
import { formatCents } from "../../shared/lib/format";
import { EmptyState, ErrorMessage, Loading } from "../../shared/ui/feedback";

const PERIODS: Array<{ value: DashboardPeriod; label: string }> = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
];

const compactBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact" });
const dayLabel = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>("7d");
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-dashboard", period],
    queryFn: () => adminApi.get<DashboardDto>("/dashboard", { period }),
    placeholderData: keepPreviousData,
  });

  return (
    <section>
      <header className="page-header">
        <h1>Dashboard</h1>
        <div className="segmented segmented--compact">
          {PERIODS.map((p) => (
            <button key={p.value} className={period === p.value ? "is-active" : ""} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>
      </header>

      {isLoading && <Loading />}
      {error && <ErrorMessage error={error} />}

      {data && (
        <div className="dashboard">
          <div className="stats">
            <Stat label="Faturamento" value={formatCents(data.revenueCents)} accent />
            <Stat label="Pedidos" value={String(data.orders)} />
            <Stat label="Ticket médio" value={formatCents(data.averageTicketCents)} />
            <Stat label="Cancelados" value={String(data.cancelled)} />
          </div>

          <div className="dashboard__grid">
            <article className="card">
              <h2 className="card__title">Faturamento por dia</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.revenueByDay} margin={{ left: 4, right: 8 }}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="date" tickFormatter={dayLabel} tickLine={false} axisLine={false} minTickGap={12} />
                  <YAxis tickFormatter={(v: number) => compactBRL.format(v / 100)} tickLine={false} axisLine={false} width={64} />
                  <Tooltip
                    formatter={(value: number) => [formatCents(value), "Faturamento"]}
                    labelFormatter={(label: string) => dayLabel(label)}
                    cursor={{ fill: "var(--hover)" }}
                  />
                  <Bar dataKey="revenueCents" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="card">
              <h2 className="card__title">Mais vendidos</h2>
              {data.topProducts.length === 0 ? (
                <EmptyState title="Sem vendas no período" />
              ) : (
                <ol className="ranking">
                  {data.topProducts.map((p, i) => {
                    const max = Math.max(...data.topProducts.map((t) => t.quantity));
                    return (
                      <li key={p.productId}>
                        <span className="ranking__pos">{i + 1}</span>
                        <div className="grow">
                          <div className="ranking__row">
                            <strong>{p.name}</strong>
                            <span className="muted small">
                              {p.quantity} un · {formatCents(p.revenueCents)}
                            </span>
                          </div>
                          <div className="ranking__bar" style={{ width: `${(p.quantity / max) * 100}%` }} />
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </article>
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <article className={`card stat ${accent ? "stat--accent" : ""}`}>
      <h2 className="stat__label">{label}</h2>
      <p className="stat__value">{value}</p>
    </article>
  );
}
