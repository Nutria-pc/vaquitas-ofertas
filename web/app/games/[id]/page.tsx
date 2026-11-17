"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_URL = "https://vaquitas-ofertas.onrender.com";

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
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [includeIva, setIncludeIva] = useState(false);
  const [activeTab, setActiveTab] = useState<"prices" | "history" | "info">("prices");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    fetch(`${API_URL}/games/${id}`)
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: Registro no encontrado en Render`);
        }
        return r.json();
      })
      .then((data: GameDetail) => {
        setGame(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Error de red con Render";
        setError(msg);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center text-white">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#66c0f4] border-r-transparent" />
        <p className="mt-3 text-xs text-[#8f98a0]">Cargando ficha SteamDB desde Render...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded border border-rose-500/40 bg-[#16202d] p-8 text-center shadow-xl">
          <p className="text-sm font-bold text-rose-300">No se pudo cargar la ficha SteamDB del juego</p>
          <p className="mt-1 text-xs text-[#8f98a0] font-mono">{error || "Registro no encontrado"}</p>
          <Link
            href="/"
            className="mt-5 inline-block rounded bg-[#2a475e] px-4 py-2 text-xs font-bold text-white hover:bg-[#3b6180]"
          >
            ← Volver a Vaquitas Ofertas
          </Link>
        </div>
      </div>
    );
  }

  const sortedAll = [...(game.prices || [])].sort((a, b) => a.price_crc - b.price_crc);
  const bestByStoreMap = new Map<string, PriceRow>();
  for (const row of sortedAll) {
    if (!bestByStoreMap.has(row.store)) {
      bestByStoreMap.set(row.store, row);
    }
  }
  const storeRows = Array.from(bestByStoreMap.values()).sort((a, b) => a.price_crc - b.price_crc);
  const bestOffer = storeRows[0] || null;

  const historicalLow = sortedAll.length > 0 ? sortedAll[0].price_crc : null;
  const highestRegular = sortedAll.reduce((acc, r) => {
    const base = r.regular_price_crc ?? r.price_crc;
    return base > acc ? base : acc;
  }, 0);
  const maxSavingsCrc =
    bestOffer && highestRegular > bestOffer.price_crc ? highestRegular - bestOffer.price_crc : 0;

  const mcFact = (game.facts || []).find(
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

      <section className="rounded bg-[#16202d] border border-[#2a475e]/70 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7 p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#2a475e] px-2 py-0.5 font-mono text-[11px] font-bold text-[#66c0f4]">
                    APP ID: {game.id}
                  </span>
                  <span className="rounded bg-[#171a21] px-2 py-0.5 text-[11px] font-semibold text-[#8f98a0] border border-[#2a475e]">
                    {storeRows.length} {storeRows.length === 1 ? "tienda activa" : "tiendas activas"}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {game.title}
                </h1>
              </div>

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

          <div className="lg:col-span-5 flex flex-col justify-between bg-[#171a21] border-t lg:border-t-0 lg:border-l border-[#2a475e]/60">
            <div className="aspect-[16/9] w-full bg-[#0f1922] overflow-hidden">
              {game.cover_url ? (
                <img src={game.cover_url} alt={game.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-[#8f98a0]">
                  Sin imagen de cabecera
                </div>
              )}
            </div>

            <div className="p-5 flex flex-col gap-3">
              {bestOffer ? (
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
                      {bestOffer.price_crc === 0 ? "Descargar ↗" : "Ir a tienda ↗"}
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-[#8f98a0]">Sin enlace directo disponible.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Precio Actual</p>
          <p className="mt-1 text-2xl font-black text-white">{bestOffer ? formatCRC(bestOffer.price_crc, includeIva) : "—"}</p>
          <p className="mt-0.5 text-xs text-[#66c0f4]">{bestOffer?.store || "—"}</p>
        </div>
        <div className="rounded bg-[#16202d] border border-[#6fa720]/50 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#beee11]">Mínimo Histórico</p>
          <p className="mt-1 text-2xl font-black text-[#beee11]">{historicalLow !== null ? formatCRC(historicalLow, includeIva) : "—"}</p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Menor registro</p>
        </div>
        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Precio Base</p>
          <p className="mt-1 text-2xl font-black text-[#c7d5e0]">{highestRegular > 0 ? formatCRC(highestRegular, includeIva) : "—"}</p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Sin rebaja</p>
        </div>
        <div className="rounded bg-[#16202d] border border-[#2a475e]/70 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#8f98a0]">Ahorro Máximo</p>
          <p className="mt-1 text-2xl font-black text-[#66c0f4]">{maxSavingsCrc > 0 ? formatCRC(maxSavingsCrc, includeIva) : "₡0"}</p>
          <p className="mt-0.5 text-xs text-[#8f98a0]">Frente a regular</p>
        </div>
      </section>

      <section className="mt-6 rounded bg-[#16202d] border border-[#2a475e]/70 overflow-hidden shadow-xl">
        <div className="flex flex-wrap border-b border-[#2a475e]/70 bg-[#171a21]">
          <button
            type="button"
            onClick={() => setActiveTab("prices")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "prices" ? "border-[#66c0f4] text-white bg-[#16202d]" : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Precios por Tienda ({storeRows.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "history" ? "border-[#66c0f4] text-white bg-[#16202d]" : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Historial ({sortedAll.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`px-5 py-3 text-xs font-extrabold uppercase tracking-wider border-b-2 transition ${
              activeTab === "info" ? "border-[#66c0f4] text-white bg-[#16202d]" : "border-transparent text-[#8f98a0] hover:text-white"
            }`}
          >
            Aliases y Hechos ({(game.aliases || []).length + (game.facts || []).length})
          </button>
        </div>

        {activeTab === "prices" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#171a21] text-[11px] uppercase tracking-wider text-[#8f98a0]">
                <tr>
                  <th className="px-5 py-3">Tienda</th>
                  <th className="px-5 py-3">Formato</th>
                  <th className="px-5 py-3">Divisa Original</th>
                  <th className="px-5 py-3">Precio CRC</th>
                  <th className="px-5 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a475e]/40">
                {storeRows.map((p, idx) => {
                  const isBest = idx === 0;
                  return (
                    <tr key={`${p.store}-${idx}`} className={`hover:bg-[#2a475e]/30 transition-colors ${isBest ? "bg-[#4c6b22]/15" : ""}`}>
                      <td className="px-5 py-3.5 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{p.store}</span>
                          {isBest && <span className="rounded bg-[#4c6b22] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#beee11]">Lowest</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-[#c7d5e0]">{p.format}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#8f98a0]">{p.original_currency} {p.original_price.toFixed(2)}</td>
                      <td className="px-5 py-3.5 font-mono font-bold text-white">{formatCRC(p.price_crc, includeIva)}</td>
                      <td className="px-5 py-3.5 text-right">
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded bg-[#2a475e] px-3 py-1.5 text-xs font-bold text-[#66c0f4] hover:bg-[#3b6180]"
                          >
                            Ver oferta ↗
                          </a>
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
          <div className="p-5 text-xs text-[#c7d5e0]">
            <p>Registros históricos totales: {sortedAll.length}</p>
          </div>
        )}

        {activeTab === "info" && (
          <div className="p-5 text-xs text-[#c7d5e0]">
            <p>Aliases registrados: {(game.aliases || []).join(", ") || "Ninguno"}</p>
          </div>
        )}
      </section>
    </div>
  );
}