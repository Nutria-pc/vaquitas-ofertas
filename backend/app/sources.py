"""Adaptadores HTML genéricos y registro de fuentes.
Antes de habilitar cada dominio: revisar robots.txt, TOS, tasa permitida y selectores.
No incluye bypass de CAPTCHA, login, proxies ni extracción de datos personales.
"""
from dataclasses import dataclass
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import httpx, os, asyncio, random

@dataclass
class Offer:
    title: str
    store: str
    price: float
    currency: str
    url: str
    format: str = "Digital"
    regular_price: float | None = None

class DomainLimiter:
    def __init__(self, limit=2):
        self._semaphores = {}
        self.limit = limit
    def for_domain(self, domain):
        return self._semaphores.setdefault(domain, asyncio.Semaphore(self.limit))

class HtmlSearchAdapter:
    """Plantilla: el equipo debe confirmar URL y selectores de la fuente elegida."""
    def __init__(self, name, search_url_template, selectors, currency="USD", allowed=False):
        self.name, self.template, self.selectors = name, search_url_template, selectors
        self.currency, self.allowed = currency, allowed
        self.user_agent = os.getenv("USER_AGENT", "RadarGamingBot/1.0")
        self.limiter = DomainLimiter(2)

    async def search(self, client: httpx.AsyncClient, query: str):
        if not self.allowed:
            return []
        url = self.template.format(query=httpx.QueryParams({"q": query})["q"])
        host = httpx.URL(url).host
        async with self.limiter.for_domain(host):
            for attempt in range(3):
                try:
                    response = await client.get(url, headers={"User-Agent": self.user_agent}, timeout=15)
                    response.raise_for_status()
                    soup = BeautifulSoup(response.text, "html.parser")
                    results = []
                    for card in soup.select(self.selectors["card"]):
                        title_el = card.select_one(self.selectors["title"])
                        price_el = card.select_one(self.selectors["price"])
                        link_el = card.select_one(self.selectors["link"])
                        if not (title_el and price_el and link_el and link_el.get("href")):
                            continue
                        raw = price_el.get_text(" ", strip=True)
                        import re
                        match = re.search(r"([0-9]+(?:[.,][0-9]{1,2})?)", raw.replace(",", ""))
                        if not match: continue
                        href = urljoin(url, link_el["href"])
                        results.append(Offer(title_el.get_text(" ", strip=True), self.name,
                                             float(match.group(1)), self.currency, href))
                    return results
                except (httpx.HTTPError, ValueError):
                    if attempt == 2: return []
                    await asyncio.sleep((2 ** attempt) + random.random())
        return []

# Configuración deliberadamente desactivada hasta auditar robots/TOS/selectores.
# No se deben activar sin documentar evidencia en docs/adr/ y probar manualmente.
SOURCE_REGISTRY = {}
