"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://TU-URL.onrender.com";

interface GameItem {
  id: number;
  title: string;
  platforms: string;
  game_type: string;
  release_date: string | null;
  cover_url: string | null;
  msrp_crc: number | null;
  best_price_crc: number | null;
  best_store: string | null;
  best_url: string | null;
  best_regular_price_crc: number | null;
  price_count: number;
  rating: number | null;
  discount_pct: number | null;
  historical_low: boolean;
}

interface GamesResponse {
  total: number;
  page: number;
  page_size: number;
  items: GameItem[];
}

interface MetricsSummary {
  games: number;
  verified_prices: number;
  updated_last_24h: number;
}

type QuickFilter = "all" | "discounted" | "free" | "under5k" | "under15k" | "mc80";

function formatCRC(value: number | null, withIva = false): string {
  if (value === null || value === undefined) return "Sin precio";
  if (value === 0) return "Gratis";
  const amount = withIva ? value * 1.13 : value;
  return `₡${Math.round(amount).toLocaleString("es-CR")}`;
}

function metacriticSteamBadge(score: number | null): string {
  if (score === null) return "bg-[#171a21] text-[#8f98a0] border-[#2a475e]";
  if (score >= 75) return "bg-[#4c6b22] text-[#beee11] border-[#6fa720]";
  if (score >= 50) return "bg-[#7a5c12] text-[#ffd452] border-[#b3861b]";
  return "bg-[#7a2020] text-[#ff8f8f] border-[#b33030]";
}

export default function HomePage() {
  const [data, setData] = useState<GamesResponse>({
    total: 0,
    page: 1,
    page_size: 24,
    items: [],
  });
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [store, setStore] = useState("");
  const [sort, setSort] = useState("discount");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [includeIva, setIncludeIva] = useState(false);
  const [featuredIdx, setFeaturedIdx] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch(`${API_URL}/metrics`)
      .then((r) => r.json())
      .then((m) => setMetrics(m))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const effectiveSize = quickFilter === "all" ? "24" : "100";
    const params = new URLSearchParams({
      page: String(quickFilter === "all" ? page : 1),
      page_size: effectiveSize,
      sort: quickFilter === "free" || quickFilter === "under5k" || quickFilter === "under15k" ? "price" : sort,
    });
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (store) params.set("store", store);

    fetch(`${API_URL}/games?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setData({
          total: res?.total ?? 0,
          page: res?.page ?? 1,
          page_size: res?.page_size ?? 24,
          items: Array.isArray(res?.items) ? res.items : [],
        });
        setFeaturedIdx(0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQ, store, sort, page, quickFilter]);

  const filteredItems = useMemo(() => {
    const factor = includeIva ? 1.13 : 1;
    return (Array.isArray(data?.items) ? data.items : []).filter((g) => {
      const effectivePrice = g.best_price_crc !== null ? g.best_price_crc * factor : null;
      if (quickFilter === "free") return g.best_price_crc === 0;
      if (quickFilter === "under5k") return effectivePrice !== null && effectivePrice > 0 && effectivePrice <= 5000;
      if (quickFilter === "under15k") return effectivePrice !== null && effectivePrice > 0 && effectivePrice <= 15000;
      if (quickFilter === "mc80") return g.rating !== null && g.rating >= 80;
      if (quickFilter === "discounted") return g.discount_pct !== null && g.discount_pct > 0;
      return true;
    });
  }, [data.items, quickFilter, includeIva]);

  const featuredList = useMemo(() => {
    return filteredItems.filter((g) => g.cover_url).slice(0, 5);
  }, [filteredItems]);

  const currentFeatured = featuredList[featuredIdx] || null;
  const totalPages = quickFilter === "all" ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  const storeTabs: { id: QuickFilter; label: string }[] = [
    { id: "all", label: "Destacados" },
    { id: "discounted", label: "Ofertas Especiales" },
    { id: "free", label: "Gratis (F2P)" },
    { id: "under5k", label: "Menos de ₡5.000" },
    { id: "under15k", label: "Menos de ₡15.000" },
    { id: "mc80", label: "Metacritic 80+" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Barra de Navegación Azul Estilo Steam Store */}
      <div className="rounded bg-gradient-to-r from-[#234d73] via-[#1f4263] to-[#193550] p-2 shadow-xl border border-[#3d6c96]/40">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Pestañas de tienda */}
          <div className="flex flex-wrap items-center gap-1">
            {storeTabs.map((tab) => {
              const active = quickFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setQuickFilter(tab.id);
                    setPage(1);
                  }}
                  className={`rounded px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-[#66c0f4] text-[#171a21] shadow"
                      : "text-[#d2e8f5] hover:bg-[#316282]/70 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Buscador integrado estilo Steam */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="buscar en la tienda..."
                className="w-full rounded bg-[#316282] px-3 py-1.5 text-xs text-white placeholder-[#9ec5de] border border-[#171a21]/60 focus:border-[#66c0f4] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => setIncludeIva((v) => !v)}
              className={`rounded px-2.5 py-1.5 text-[11px] font-bold border transition shrink-0 ${
                includeIva
                  ? "bg-[#4c6b22] text-[#beee11] border-[#6fa720]"
                  : "bg-[#171a21]/80 text-[#c7d5e0] border-[#3d6c96]/40 hover:text-white"
              }`}
            >
              {includeIva ? "✓ +13% IVA CR" : "+13% IVA CR"}
            </button>
          </div>
        </div>
      </div>

      {/* Vitrina Destacada estilo Steam ("DESTACADOS Y RECOMENDADOS") */}
      {!loading && currentFeatured && (
        <section className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-white">
              Destacados y Recomendados · Analítica SteamDB
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-[#8f98a0]">
              <span>{metrics?.games ?? data.total} títulos indexados</span>
              <span>·</span>
              <span className="text-[#66c0f4] font-semibold">
                {metrics?.verified_prices ?? "—"} precios verificados
              </span>
            </div>
          </div>

          <div className="overflow-hidden rounded bg-[#0f1922] border border-[#2a475e]/70 shadow-2xl grid grid-cols-1 lg:grid-cols-12">
            {/* Imagen grande izquierda */}
            <Link
              href={`/games/${currentFeatured.id}`}
              className="lg:col-span-7 relative aspect-[16/9] lg:aspect-auto min-h-[260px] bg-[#171a21] overflow-hidden group"
            >
              <img
                src={currentFeatured.cover_url!}
                alt={currentFeatured.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2">
                <span className="rounded bg-[#171a21]/90 px-2.5 py-1 text-[11px] font-bold text-[#66c0f4] border border-[#2a475e]">
                  Ver ficha SteamDB →
                </span>
              </div>
            </Link>

            {/* Panel derecho estilo Steam Store */}
            <div className="lg:col-span-5 p-5 sm:p-6 flex flex-col justify-between bg-gradient-to-b from-[#16202d] to-[#0f1922]">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/games/${currentFeatured.id}`}
                    className="text-xl sm:text-2xl font-bold text-white hover:text-[#66c0f4] transition-colors"
                  >
                    {currentFeatured.title}
                  </Link>
                  <div
                    className={`shrink-0 rounded border px-2 py-1 text-xs font-extrabold ${metacriticSteamBadge(
                      currentFeatured.rating
                    )}`}
                  >
                    MC {currentFeatured.rating !== null ? Math.round(currentFeatured.rating) : "—"}
                  </div>
                </div>

                <p className="mt-2 text-xs text-[#8f98a0]">
                  Plataformas: <span className="text-[#c7d5e0]">{currentFeatured.platforms || "PC"}</span>
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded bg-[#2a475e]/70 px-2 py-0.5 text-[11px] text-[#66c0f4] font-semibold">
                    {currentFeatured.price_count}{" "}
                    {currentFeatured.price_count === 1 ? "tienda activa" : "tiendas activas"}
                  </span>
                  <span className="rounded bg-[#2a475e]/70 px-2 py-0.5 text-[11px] text-[#c7d5e0]">
                    Mejor tienda: {currentFeatured.best_store || "Steam"}
                  </span>
                </div>
              </div>

              {/* Caja de precio estilo Steam */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-stretch overflow-hidden rounded bg-[#000000]/50">
                    {currentFeatured.best_price_crc === 0 ? (
                      <span className="bg-[#4c6b22] px-3 py-1.5 text-sm font-black text-[#beee11]">
                        FREE-TO-PLAY
                      </span>
                    ) : currentFeatured.discount_pct && currentFeatured.discount_pct > 0 ? (
                      <span className="bg-[#4c6b22] px-3 py-1.5 text-lg font-black text-[#beee11]">
                        -{Math.round(currentFeatured.discount_pct)}%
                      </span>
                    ) : null}

                    <div className="px-3 py-1.5 flex flex-col justify-center">
                      {currentFeatured.discount_pct &&
                        currentFeatured.discount_pct > 0 &&
                        currentFeatured.best_regular_price_crc && (
                          <span className="text-[11px] text-[#738895] line-through leading-none">
                            {formatCRC(currentFeatured.best_regular_price_crc, includeIva)}
                          </span>
                        )}
                      <span className="text-sm font-bold text-[#beee11] leading-tight">
                        {formatCRC(currentFeatured.best_price_crc, includeIva)}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/games/${currentFeatured.id}`}
                    className="rounded bg-gradient-to-r from-[#75b022] to-[#588a1b] px-4 py-2 text-xs font-bold text-white shadow hover:brightness-110 transition"
                  >
                    Comparar precios
                  </Link>
                </div>

                {/* Selector de diapositivas estilo Steam */}
                {featuredList.length > 1 && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    {featuredList.map((item, i) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeaturedIdx(i)}
                        aria-label={`Destacado ${i + 1}`}
                        className={`h-2.5 rounded-sm transition-all ${
                          i === featuredIdx
                            ? "w-7 bg-[#66c0f4]"
                            : "w-4 bg-[#2a475e] hover:bg-[#4b7291]"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Barra de Filtros Secundarios (Tienda y Ordenamiento) */}
      <section className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded bg-[#16202d] px-4 py-3 border border-[#2a475e]/60">
        <div className="text-xs text-[#8f98a0]">
          Explorando <strong className="text-white">{filteredItems.length}</strong> resultados
          {quickFilter === "all" && (
            <>
              {" "}
              de <strong className="text-white">{data.total}</strong> juegos en base de datos
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={store}
            onChange={(e) => {
              setStore(e.target.value);
              setPage(1);
            }}
            className="rounded bg-[#171a21] px-3 py-1.5 text-xs text-[#c7d5e0] border border-[#2a475e] focus:border-[#66c0f4] focus:outline-none"
          >
            <option value="">Tienda: Todas</option>
            <option value="Steam">Steam</option>
            <option value="GOG">GOG</option>
            <option value="Epic">Epic Games Store</option>
            <option value="Humble">Humble Store</option>
            <option value="Fanatical">Fanatical</option>
            <option value="GreenManGaming">Green Man Gaming</option>
            <option value="Gamesplanet">Gamesplanet</option>
          </select>

          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="rounded bg-[#171a21] px-3 py-1.5 text-xs text-[#c7d5e0] border border-[#2a475e] focus:border-[#66c0f4] focus:outline-none"
          >
            <option value="discount">Ordenar: Mayor descuento</option>
            <option value="price">Ordenar: Menor precio (₡)</option>
            <option value="rating">Ordenar: Mejor Metacritic</option>
            <option value="name">Ordenar: Alfabético (A-Z)</option>
          </select>
        </div>
      </section>

      {/* Catálogo de Tarjetas Estilo Steam Store */}
      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded bg-[#16202d] border border-[#2a475e]/40"
            />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mt-8 rounded bg-[#16202d] border border-[#2a475e]/60 p-10 text-center">
          <p className="text-base font-bold text-white">No hay juegos que coincidan con este filtro</p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setStore("");
              setQuickFilter("all");
            }}
            className="mt-3 rounded bg-[#66c0f4] px-4 py-1.5 text-xs font-bold text-[#171a21]"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((game) => {
            const isFree = game.best_price_crc === 0;
            const hasDiscount = !isFree && game.discount_pct !== null && game.discount_pct > 0;
            const offerLabel =
              game.price_count === 1 ? "1 oferta" : `${game.price_count} ofertas`;

            return (
              <Link
                key={game.id}
                href={`/games/${game.id}`}
                className="group flex flex-col overflow-hidden rounded bg-[#16202d] border border-[#2a475e]/50 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-[#66c0f4] hover:bg-[#1e2d3f]"
              >
                {/* Portada */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#171a21]">
                  {game.cover_url ? (
                    <img
                      src={game.cover_url}
                      alt={game.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[#8f98a0]">
                      Sin portada
                    </div>
                  )}

                  {/* Metacritic Badge */}
                  <div
                    className={`absolute right-2.5 top-2.5 rounded border px-2 py-0.5 text-[11px] font-extrabold shadow ${metacriticSteamBadge(
                      game.rating
                    )}`}
                  >
                    MC {game.rating !== null ? Math.round(game.rating) : "—"}
                  </div>
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col justify-between p-3.5">
                  <div>
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#8f98a0]">
                      <span className="truncate">{game.platforms || "PC"}</span>
                      <span className="rounded bg-[#2a475e]/80 px-1.5 py-0.5 font-semibold text-[#66c0f4] shrink-0">
                        {offerLabel}
                      </span>
                    </div>

                    <h3 className="mt-1.5 line-clamp-2 text-sm font-bold text-white group-hover:text-[#66c0f4] transition-colors">
                      {game.title}
                    </h3>
                  </div>

                  {/* Caja de precio inferior estilo Steam */}
                  <div className="mt-3 pt-2.5 border-t border-[#2a475e]/40 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-[#8f98a0] truncate">
                      {game.best_store || "N/D"}
                    </span>

                    <div className="inline-flex items-stretch overflow-hidden rounded bg-[#000000]/45 shrink-0">
                      {isFree ? (
                        <span className="bg-[#4c6b22] px-2 py-1 text-[11px] font-black text-[#beee11]">
                          GRATIS
                        </span>
                      ) : hasDiscount ? (
                        <span className="bg-[#4c6b22] px-2 py-1 text-xs font-black text-[#beee11]">
                          -{Math.round(game.discount_pct!)}%
                        </span>
                      ) : null}

                      <div className="px-2.5 py-1 text-right">
                        {hasDiscount && game.best_regular_price_crc && (
                          <div className="text-[10px] text-[#738895] line-through leading-none">
                            {formatCRC(game.best_regular_price_crc, includeIva)}
                          </div>
                        )}
                        <div className="text-xs font-bold text-[#c7d5e0] leading-tight">
                          {formatCRC(game.best_price_crc, includeIva)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded bg-[#2a475e] px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-[#3b6180]"
          >
            ← Anterior
          </button>
          <span className="text-xs text-[#8f98a0]">
            Página <strong className="text-white">{page}</strong> de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded bg-[#2a475e] px-3.5 py-1.5 text-xs font-bold text-white disabled:opacity-40 hover:bg-[#3b6180]"
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}


