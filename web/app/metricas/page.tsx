"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_URL = "https://vaquitas-ofertas.onrender.com";

interface MetricsData {
  games: number;
  price_observations: number;
  verified_prices: number;
  stale_prices: number;
  unmatched_or_uncertain: number;
  updated_last_24h: number;
  pipeline_modes: string[];
  last_price_observation: string | null;
}

export default function MetricasPage() {
  const [data, setData] = useState<MetricsData | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/metrics`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  const healthPct =
    data && data.price_observations > 0
      ? Math.min(100, Math.round((data.verified_prices / data.price_observations) * 100))
      : 100;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[#2a475e]/60 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Vaquitas Ofertas · Database &amp; Crawler Status
          </h1>
          <p className="mt-1 text-xs text-[#8f98a0]">
            Monitoreo en tiempo real del motor de indexación estilo SteamDB para Costa Rica.
          </p>
        </div>

        <Link
          href="/"
          className="rounded bg-[#2a475e] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#3b6180]"
        >
          ← V← Volver a la tienda
        </Link>
      </div>

      {!data ? (
        <div className="h-64 animate-pulse rounded bg-[#16202d] border border-[#2a475e]/50" />
      ) : (
        <>
          <div className="mb-6 rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">
                  Estado de verificación de precios
                </p>
                <p className="text-lg font-extrabold text-white">
                  {healthPct}% de registros activos y verificados
                </p>
              </div>
              <span className="rounded bg-[#4c6b22] px-3 py-1 text-xs font-black text-[#beee11]">
                ONLINE · COSTA RICA
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-sm bg-[#171a21]">
              <div
                className="h-full bg-gradient-to-r from-[#4c6b22] to-[#beee11] transition-all duration-500"
                style={{ width: `${healthPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Apps Indexadas</p>
              <p className="mt-2 font-mono text-3xl font-black text-white">{data.games}</p>
              <p className="mt-1 text-xs text-[#8f98a0]">Fichas canónicas en catálogo</p>
            </div>

            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Precios Verificados</p>
              <p className="mt-2 font-mono text-3xl font-black text-[#beee11]">
                {data.verified_prices}
              </p>
              <p className="mt-1 text-xs text-[#8f98a0]">Ofertas vigentes en CRC</p>
            </div>

            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Actualizados (24h)</p>
              <p className="mt-2 font-mono text-3xl font-black text-[#66c0f4]">
                {data.updated_last_24h}
              </p>
              <p className="mt-1 text-xs text-[#8f98a0]">Capturas recientes</p>
            </div>

            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Observaciones Totales</p>
              <p className="mt-2 font-mono text-3xl font-black text-[#c7d5e0]">
                {data.price_observations}
              </p>
              <p className="mt-1 text-xs text-[#8f98a0]">Registros históricos en SQLite</p>
            </div>

            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Precios Stale</p>
              <p className="mt-2 font-mono text-3xl font-black text-[#c7d5e0]">{data.stale_prices}</p>
              <p className="mt-1 text-xs text-[#8f98a0]">Fuera de ventana activa</p>
            </div>

            <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Pipeline Modes</p>
              <p className="mt-2 font-mono text-base font-bold text-white">
                {data.pipeline_modes.join(" · ")}
              </p>
              <p className="mt-1 text-xs text-[#8f98a0]">
                {data.last_price_observation
                  ? `Último sync: ${new Date(data.last_price_observation).toLocaleString("es-CR")}`
                  : "Sincronización activa"}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



