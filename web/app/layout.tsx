import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaquitas Ofertas · Tienda y Analítica de Precios estilo SteamDB (CR ₡)",
  description:
    "Comparador de videojuegos en Costa Rica con estética Steam, analítica profunda de precios por tienda tipo SteamDB, colones (CRC) y Metacritic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <Script
          src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"
          strategy="beforeInteractive"
        />
      </head>
      <body className="min-h-screen bg-[#1b2838] text-[#c7d5e0] flex flex-col selection:bg-[#66c0f4]/30 selection:text-white">
        {/* Global Header estilo Steam */}
        <header className="sticky top-0 z-40 border-b border-[#2a475e]/70 bg-[#171a21] shadow-lg">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-gradient-to-br from-[#66c0f4] to-[#1a44c2] text-[#171a21] font-black text-lg shadow-md ring-1 ring-[#66c0f4]/50 transition-transform group-hover:scale-105">
                VO
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-extrabold tracking-wider uppercase text-white">
                    Vaquitas <span className="text-[#66c0f4]">Ofertas</span>
                  </span>
                  <span className="hidden sm:inline-flex items-center rounded bg-[#2a475e] px-2 py-0.5 text-[11px] font-semibold text-[#66c0f4]">
                    COSTA RICA · CRC ₡
                  </span>
                </div>
                <p className="text-[11px] text-[#8f98a0] hidden sm:block">
                  Storefront &amp; Price Database · Multi-tienda y Metacritic
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-1 sm:gap-3 text-xs sm:text-sm font-bold uppercase tracking-wide">
              <Link
                href="/"
                className="rounded px-3 py-2 text-[#c7d5e0] transition hover:bg-[#2a475e] hover:text-white"
              >
                Tienda
              </Link>
              <Link
                href="/metricas"
                className="rounded px-3 py-2 text-[#c7d5e0] transition hover:bg-[#2a475e] hover:text-white"
              >
                SteamDB Status
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer estilo Steam */}
        <footer className="border-t border-[#2a475e]/60 bg-[#171a21] mt-16">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-7 text-xs text-[#8f98a0] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[#beee11]"></span>
              <span className="font-bold text-white">Vaquitas Ofertas</span>
              <span>· Base de datos de precios en Colones Costarricenses (CRC)</span>
            </div>
            <p className="text-[#67707b]">
              Inspirado en Steam Store &amp; SteamDB · Precios verificados y calificaciones de Metacritic.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
