"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://TU-URL.onrender.com";

interface PriceRow {
  store: string;
  price_crc: number;
  regular_price_crc: number | null;
  original_price: number;
  original_currency: string;
  url: string | null;
  format: string;
  observed_at: string;
  verified: boolean;
  stale: boolean;
}

interface ExternalFactRow {
  source: string;
  type: string;
  value: string;
  url: string | null;
  observed_at: string;
}

interface GameDetail {
  id: number;
  title: string;
  platforms: string;
  game_type: string;
  release_date: string | null;
  msrp_crc: number | null;
  cover_url: string | null;
  aliases: string[];
  prices: PriceRow[];
  facts: ExternalFactRow[];
}

function formatCRC(value: number | null, withIva = false): string {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "Gratis";
  const finalAmount = withIva ? value * 1.13 : value;
  return `₡${Math.round(finalAmount).toLocaleString("es-CR")}`;
}

function metacriticBoxStyle(score: number): string {
  if (score >= 75) return "bg-[#4c6b22] text-[#beee11] border-[#6fa720]";
  if (score >= 50) return "bg-[#7a5c12] text-[#ffd452] border-[#b3861b]";
  return "bg-[#7a2020] text-[#ff8f8f] border-[#b33030]";
}

export default function GameDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeIva, setIncludeIva] = useState(false);
  const [activeTab, setActiveTab] = useState<"prices" | "history" | "info">("prices");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`${API_URL}/games/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar la ficha SteamDB del juego");
        return r.json();
      })
      .then((data: GameDetail) => {
        setGame(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-5">
        <div className="h-64 animate-pulse rounded bg-[#16202d] border border-[#2a475e]/40" />
        <div className="h-80 animate-pulse rounded bg-[#16202d] border border-[#2a475e]/40" />
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded border border-rose-500/40 bg-[#16202d] p-8 text-center">
          <p className="text-base font-bold text-rose-300">{error || "Registro no encontrado"}</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded bg-[#2a475e] px-4 py-2 text-xs font-bold text-white"
          >
            ← Volver a Vaquitas Ofertas
          </Link>
        </div>
      </div>
    );
  }

  // Agrupar mejor oferta actual por tienda (para la tabla estilo SteamDB)
  const sortedAll = [...game.prices].sort((a, b) => a.price_crc - b.price_crc);
  const bestByStoreMap = new Map<string, PriceRow>();
  for (const row of sortedAll) {
    if (!bestByStoreMap.has(row.store)) {
      bestByStoreMap.set(row.store, row);
    }
  }
  const storeRows = Array.from(bestByStoreMap.values()).sort((a, b) => a.price_crc - b.price_crc);
  const bestOffer = storeRows[0] || null;

  // Estadísticas históricas estilo SteamDB
  const historicalLow = sortedAll.length > 0 ? sortedAll[0].price_crc : null;
  const highestRegular = sortedAll.reduce((acc, r) => {
    const base = r.regular_price_crc ?? r.price_crc;
    return base > acc ? base : acc;
  }, 0);
  const maxSavingsCrc =
    bestOffer && highestRegular > bestOffer.price_crc ? highestRegular - bestOffer.price_crc : 0;

  const mcFact = game.facts.find(
    (f) => f.type === "metacritic" || f.source.toLowerCase().includes("metacritic")
  );
  const mcScore = mcFact ? Number(mcFact.value) : null;

  const impliedRate =
    bestOffer && bestOffer.original_currency === "USD" && bestOffer.original_price > 0
      ? (bestOffer.price_crc / bestOffer.original_price).toFixed(2)
      : null;

  const handleCopy = () => {
    if (!bestOffer) return;
    navigator.clipboard.writeText(
      `[Vaquitas Ofertas / SteamDB] ${game.title} — ${formatCRC(bestOffer.price_crc, includeIva)} en ${bestOffer.store} (${window.location.href})`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Barra superior de contexto estilo SteamDB */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[#2a475e]/60 pb-3 text-xs">
        <div className="flex items-center gap-2 text-[#8f98a0]">
          <Link href="/" className="text-[#66c0f4] hover:underline font-semibold">
            Tienda
          </Link>
          <span>/</span>
          <span className="font-mono text-[#8f98a0]">App #{game.id}</span>
          <span>/</span>
          <span className="text-white font-bold truncate">{game.title}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIncludeIva((v) => !v)}
            className={`rounded px-2.5 py-1 font-bold border transition ${
              includeIva
                ? "bg-[#4c6b22] text-[#beee11] border-[#6fa720]"
                : "bg-[#171a21] text-[#c7d5e0] border-[#2a475e] hover:text-white"
            }`}
          >
            {includeIva ? "✓ +13% IVA CR" : "+ Simular 13% IVA CR"}
          </button>

          {bestOffer && (
            <button
              type="button"
              onClick={handleCopy}
              className="rounded bg-[#171a21] border border-[#2a475e] px-2.5 py-1 font-bold text-[#c7d5e0] hover:border-[#66c0f4]"
            >
              {copied ? "✓ Copiado" : "Compartir ficha"}
            </button>
          )}
        </div>
      </div>

      {/* Cabecera estilo SteamDB: App Info Table + Portada */}
      <section className="rounded bg-[#16202d] border border-[#2a475e]/70 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Columna Izquierda: Tabla técnica de metadatos estilo SteamDB */}
          <div className="lg:col-span-7 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#2a475e] px-2 py-0.5 font-mono text-[11px] font-bold text-[#66c0f4]">
                    APP ID: {game.id}
                  </span>
                  <span className="rounded bg-[#171a21] px-2 py-0.5 text-[11px] font-semibold text-[#8f98a0] border border-[#2a475e]">
                    {storeRows.length}{" "}
                    {storeRows.length === 1 ? "tienda activa" : "tiendas activas"}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {game.title}
                </h1>
              </div>

              {/* Metacritic Box */}
              <div className="flex items-center gap-2.5 rounded bg-[#171a21] border border-[#2a475e] p-2.5">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded border text-lg font-black ${
                    mcScore !== null && !Number.isNaN(mcScore)
                      ? metacriticBoxStyle(mcScore)
                      : "bg-[#1b2838] text-[#8f98a0] border-[#2a475e]"
                  }`}
                >
                  {mcScore !== null && !Number.isNaN(mcScore) ? Math.round(mcScore) : "N/A"}
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase text-white">Metacritic</p>
                  {mcFact?.url ? (
                    <a
                      href={mcFact.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-[#66c0f4] hover:underline"
                    >
                      Abrir ficha ↗
                    </a>
                  ) : (
                    <p className="text-[11px] text-[#8f98a0]">Crítica oficial</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabla clave-valor estilo SteamDB */}
            <div className="mt-5 overflow-hidden rounded border border-[#2a475e]/60 text-xs">
              <table className="w-full">
                <tbody className="divide-y divide-[#2a475e]/40 bg-[#171a21]/70">
                  <tr>
                    <td className="w-40 px-3.5 py-2 font-semibold text-[#8f98a0]">Tipo de App</td>
                    <td className="px-3.5 py-2 text-white font-mono">{game.game_type || "Game"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-[#8f98a0]">Sistemas</td>
                    <td className="px-3.5 py-2 text-[#c7d5e0]">{game.platforms || "PC"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-[#8f98a0]">Lanzamiento</td>
                    <td className="px-3.5 py-2 text-[#c7d5e0]">{game.release_date || "No especificado"}</td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-[#8f98a0]">Ofertas Activas</td>
                    <td className="px-3.5 py-2 font-bold text-[#beee11]">
                      {storeRows.length} {storeRows.length === 1 ? "oferta verificada" : "ofertas verificadas"}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3.5 py-2 font-semibold text-[#8f98a0]">Divisa Local</td>
                    <td className="px-3.5 py-2 text-[#c7d5e0]">
                      Colón Costarricense (CRC ₡)
                      {impliedRate ? ` · T.C. observado: ₡${impliedRate}/USD` : ""}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Columna Derecha: Portada y CTA Steam */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#171a21] border-t lg:border-t-0 lg:border-l border-[#2a475e]/60">
            <div className="aspect-[16/9] w-full bg-[#0f1922] overflow-hidden">
              {game.cover_url ? (
                <img
                  src={game.cover_url}
                  alt={game.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#8f98a0]">
                  Sin imagen de cabecera
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col gap-3">
              {bestOffer ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-[#8f98a0]">
                        {bestOffer.price_crc === 0
                          ? `Descarga gratuita en ${bestOffer.store}`
                          : `Mejor precio actual en ${bestOffer.store}`}
                      </p>
                      <p className="text-2xl font-black text-[#beee11]">
                        {formatCRC(bestOffer.price_crc, includeIva)}
                      </p>
                    </div>
                    {bestOffer.url && (
                      <a
                        href={bestOffer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded bg-gradient-to-r from-[#75b022] to-[#588a1b] px-4 py-2.5 text-xs font-extrabold uppercase tracking-wide text-white shadow-lg hover:brightness-110 transition"
                      >
                        {bestOffer.price_crc === 0
                          ? `Descargar en ${bestOffer.store} ↗`
                          : `Ir a ${bestOffer.store} ↗`}
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-[#8f98a0]">Sin enlace directo disponible.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Indicadores Clave estilo SteamDB Price History */}
      <section className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">
            Precio Actual Más Bajo
          </p>
          <p className="mt-1 text-2xl font-black text-white">
            {bestOffer ? formatCRC(bestOffer.price_crc, includeIva) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-[#66c0f4]">{bestOffer?.store || "—"}</p>
        </div>

        <div className="rounded bg-[#16202d] border border-[#6fa720]/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#beee11]">
            Mínimo Histórico (SteamDB)
          </p>
          <p className="mt-1 text-2xl font-black text-[#beee11]">
            {historicalLow !== null ? formatCRC(historicalLow, includeIva) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Menor registro observado</p>
        </div>

        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">
            Precio Base Más Alto
          </p>
          <p className="mt-1 text-2xl font-black text-[#c7d5e0]">
            {highestRegular > 0 ? formatCRC(highestRegular, includeIva) : "—"}
          </p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Referencia sin rebaja</p>
        </div>

        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">
            Ahorro Máximo
          </p>
          <p className="mt-1 text-2xl font-black text-[#66c0f4]">
            {maxSavingsCrc > 0 ? formatCRC(maxSavingsCrc, includeIva) : "₡0"}
          </p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Frente a precio regular</p>
        </div>
      </section>

      {/* Gráfico Comparativo Visual por Tienda estilo SteamDB */}
      {storeRows.length > 0 && highestRegular > 0 && (
        <section className="mt-5 rounded bg-[#16202d] border border-[#2a475e]/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Distribución de Precios por Tienda (CRC ₡)
              </h2>
              <p className="text-xs text-[#8f98a0]">
                Comparación visual entre tiendas oficiales frente al mínimo histórico
              </p>
            </div>
            <span className="text-[11px] font-mono text-[#beee11]">
              Línea base mínima: {formatCRC(historicalLow, includeIva)}
            </span>
          </div>

          <div className="space-y-3">
            {storeRows.map((row, i) => {
              const ratio = Math.max(6, Math.min(100, Math.round((row.price_crc / highestRegular) * 100)));
              const isLowest = i === 0;
              return (
                <div key={`bar-${row.store}`} className="grid grid-cols-12 items-center gap-3 text-xs">
                  <div className="col-span-4 sm:col-span-3 font-bold text-white truncate">
                    {row.store}
                  </div>
                  <div className="col-span-5 sm:col-span-7 h-5 rounded bg-[#171a21] overflow-hidden p-0.5 border border-[#2a475e]/50">
                    <div
                      className={`h-full rounded-sm transition-all duration-500 ${
                        isLowest
                          ? "bg-gradient-to-r from-[#4c6b22] to-[#beee11]"
                          : "bg-gradient-to-r from-[#234d73] to-[#66c0f4]"
                      }`}
                      style={{ width: `${row.price_crc === 0 ? 12 : ratio}%` }}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2 text-right font-mono font-bold text-white">
                    {formatCRC(row.price_crc, includeIva)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pestañas estilo SteamDB (Precios por Tienda / Historial Completo / Aliases y Hechos) */}
      <section className="mt-6 rounded bg-[#16202d] border border-[#2a475e]/70 overflow-hidden shadow-xl">
        <div className="flex flex-wrap border-b border-[#2a475e]/70 bg-[#171a21]">
          <button
            type="button"
            onClick={() => setActiveTab("prices")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "prices"
                ? "border-[#66c0f4] text-white bg-[#16202d]"
                : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Precios por Tienda ({storeRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "history"
                ? "border-[#66c0f4] text-white bg-[#16202d]"
                : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Historial de Observaciones ({sortedAll.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "info"
                ? "border-[#66c0f4] text-white bg-[#16202d]"
                : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Aliases y Hechos Externos ({game.aliases.length + game.facts.length})
          </button>
        </div>

        {activeTab === "prices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#171a21] text-[11px] uppercase tracking-wider text-[#8f98a0]">
                <tr>
                  <th className="px-5 py-3">Tienda</th>
                  <th className="px-5 py-3">Edición / Formato</th>
                  <th className="px-5 py-3">Divisa Original</th>
                  <th className="px-5 py-3">Descuento</th>
                  <th className="px-5 py-3">Precio CRC</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a475e]/40">
                {storeRows.map((p, idx) => {
                  const hasDiscount =
                    p.regular_price_crc !== null && p.regular_price_crc > p.price_crc;
                  const pct = hasDiscount
                    ? Math.round((1 - p.price_crc / p.regular_price_crc!) * 100)
                    : 0;
                  const isBest = idx === 0;

                  return (
                    <tr
                      key={`${p.store}-${idx}`}
                      className={`hover:bg-[#2a475e]/30 transition-colors ${
                        isBest ? "bg-[#4c6b22]/15" : ""
                      }`}
                    >
                      <td className="px-5 py-3.5 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{p.store}</span>
                          {isBest && (
                            <span className="rounded bg-[#4c6b22] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#beee11]">
                              Lowest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#c7d5e0]">{p.format}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#8f98a0]">
                        {p.original_currency} {p.original_price.toFixed(2)}
                      </td>
                      <td className="px-5 py-3.5">
                        {p.price_crc === 0 ? (
                          <span className="rounded bg-[#4c6b22] px-2 py-0.5 text-xs font-black text-[#beee11]">
                            FREE
                          </span>
                        ) : pct > 0 ? (
                          <span className="rounded bg-[#4c6b22] px-2 py-0.5 text-xs font-black text-[#beee11]">
                            -{pct}%
                          </span>
                        ) : (
                          <span className="text-xs text-[#8f98a0]">0%</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-white">
                        {formatCRC(p.price_crc, includeIva)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {p.url ? (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-block rounded px-3 py-1.5 text-xs font-bold transition ${
                              isBest
                                ? "bg-gradient-to-r from-[#75b022] to-[#588a1b] text-white hover:brightness-110"
                                : "bg-[#2a475e] text-[#66c0f4] hover:bg-[#3b6180] hover:text-white"
                            }`}
                          >
                            {p.price_crc === 0 ? "Descargar ↗" : "Comprar ↗"}
                          </a>
                        ) : (
                          <span className="text-xs text-[#8f98a0]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "history" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171a21] text-[11px] uppercase tracking-wider text-[#8f98a0]">
                <tr>
                  <th className="px-5 py-3">Fecha Captura</th>
                  <th className="px-5 py-3">Tienda</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Monto Original</th>
                  <th className="px-5 py-3">Monto CRC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a475e]/40">
                {sortedAll.map((obs, i) => (
                  <tr key={`hist-${i}`} className="hover:bg-[#2a475e]/20">
                    <td className="px-5 py-3 font-mono text-[#8f98a0]">
                      {obs.observed_at ? new Date(obs.observed_at).toLocaleString("es-CR") : "Reciente"}
                    </td>
                    <td className="px-5 py-3 font-bold text-white">{obs.store}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          obs.verified
                            ? "bg-[#4c6b22]/60 text-[#beee11]"
                            : "bg-[#2a475e] text-[#c7d5e0]"
                        }`}
                      >
                        {obs.verified ? "VERIFIED" : "OBSERVED"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-[#c7d5e0]">
                      {obs.original_currency} {obs.original_price.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-white">
                      {formatCRC(obs.price_crc, includeIva)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "info" && (
          <div className="p-5 space-y-5 text-xs">
            <div>
              <h3 className="font-bold uppercase tracking-wider text-[#66c0f4] mb-2">
                Aliases Canónicos Indexados
              </h3>
              {game.aliases.length === 0 ? (
                <p className="text-[#8f98a0]">Sin aliases alternativos registrados.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {game.aliases.map((al, i) => (
                    <span
                      key={i}
                      className="rounded bg-[#171a21] border border-[#2a475e] px-2.5 py-1 font-mono text-[#c7d5e0]"
                    >
                      {al}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-bold uppercase tracking-wider text-[#66c0f4] mb-2">
                Hechos Externos (Metacritic / Fuentes)
              </h3>
              {game.facts.length === 0 ? (
                <p className="text-[#8f98a0]">Sin hechos externos registrados para este ID.</p>
              ) : (
                <div className="space-y-2">
                  {game.facts.map((f, i) => (
                    <div
                      key={i}
                      className="flex flex-wrap items-center justify-between rounded bg-[#171a21] border border-[#2a475e]/60 px-3.5 py-2"
                    >
                      <div>
                        <span className="font-bold text-white">{f.source}</span>{" "}
                        <span className="text-[#8f98a0]">({f.type})</span>:{" "}
                        <span className="font-mono font-bold text-[#beee11]">{f.value}</span>
                      </div>
                      {f.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#66c0f4] hover:underline"
                        >
                          Fuente externa ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}


