"""Adaptadores de fuentes autorizadas multi-tienda para Radar de Ofertas Gaming."""
from dataclasses import dataclass
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import httpx, os, asyncio, random, re

@dataclass
class Offer:
    title: str
    store: str
    price: float
    currency: str
    url: str
    format: str = "Digital"
    regular_price: float | None = None
    metacritic_score: int | None = None
    metacritic_url: str | None = None

class DomainLimiter:
    def __init__(self, limit=2):
        self._semaphores = {}
        self.limit = limit
    def for_domain(self, domain):
        return self._semaphores.setdefault(domain, asyncio.Semaphore(self.limit))

def _clean_title(title: str) -> str:
    cleaned = re.sub(r"[™®©]", "", title)
    return re.split(r"\s+[—–-]\s+", cleaned)[0].strip()

class CheapSharkMultiStoreAdapter:
    BASE_URL = "https://www.cheapshark.com/api/1.0"
    DEFAULT_STORES = {
        "1": "Steam", "2": "GamersGate", "3": "GreenManGaming", "7": "GOG",
        "8": "Origin / EA App", "11": "Humble Store", "13": "Ubisoft Store",
        "15": "Fanatical", "21": "WinGameStore", "23": "GameBillet",
        "24": "Voidu", "25": "Epic Games Store", "27": "Gamesplanet",
        "28": "Gamesload", "29": "2Game", "30": "IndieGala",
        "31": "Blizzard Shop", "33": "DLGamer", "34": "Noctre", "35": "DreamGame",
    }
    def __init__(self, allowed=True, exclude_steam=True):
        self.name, self.currency, self.allowed, self.exclude_steam = "CheapShark Multi-Store", "USD", allowed, exclude_steam
        self.user_agent = os.getenv("USER_AGENT", "RadarGamingBot/1.0")
        self.limiter = DomainLimiter(2)
        self._store_map = dict(self.DEFAULT_STORES)
        self._stores_loaded = False

    async def _ensure_store_map(self, client: httpx.AsyncClient):
        if self._stores_loaded: return
        try:
            resp = await client.get(f"{self.BASE_URL}/stores", headers={"User-Agent": self.user_agent}, timeout=10)
            resp.raise_for_status()
            for st in resp.json():
                if st.get("isActive"): self._store_map[str(st["storeID"])] = st["storeName"]
        except Exception: pass
        self._stores_loaded = True

    async def search(self, client: httpx.AsyncClient, query: str) -> list[Offer]:
        clean_q = _clean_title(query)
        if not self.allowed or not clean_q: return []
        await self._ensure_store_map(client)
        async with self.limiter.for_domain("www.cheapshark.com"):
            try:
                resp = await client.get(f"{self.BASE_URL}/games", params={"title": clean_q, "limit": 8}, headers={"User-Agent": self.user_agent}, timeout=15)
                resp.raise_for_status()
                games = resp.json()
                if not games: return []
                q_norm = clean_q.lower()
                best_game = next((g for g in games if _clean_title(g.get("external", "")).lower() == q_norm), games[0])
                game_id = best_game.get("gameID")
                if not game_id: return []

                detail_resp = await client.get(f"{self.BASE_URL}/games", params={"id": game_id}, headers={"User-Agent": self.user_agent}, timeout=15)
                detail_resp.raise_for_status()
                detail = detail_resp.json()
                canonical_title = detail.get("info", {}).get("title", query)
                deals = detail.get("deals", [])

                mc_score, mc_url = None, None
                try:
                    d_resp = await client.get(f"{self.BASE_URL}/deals", params={"title": clean_q, "pageSize": 10}, headers={"User-Agent": self.user_agent}, timeout=10)
                    if d_resp.status_code == 200:
                        for d in d_resp.json():
                            if str(d.get("gameID")) == str(game_id) or _clean_title(d.get("title", "")).lower() == q_norm:
                                mc_raw = d.get("metacriticScore")
                                if mc_raw and str(mc_raw).isdigit() and int(mc_raw) > 0:
                                    mc_score = int(mc_raw)
                                    mc_link = d.get("metacriticLink")
                                    mc_url = f"https://www.metacritic.com{mc_link}" if mc_link else None
                                    break
                except Exception: pass

                results, seen_stores = [], set()
                for deal in deals:
                    store_id = str(deal.get("storeID", ""))
                    if self.exclude_steam and store_id == "1": continue
                    store_name = self._store_map.get(store_id)
                    if not store_name or store_name in seen_stores: continue
                    seen_stores.add(store_name)
                    sale_price = float(deal.get("price", 0))
                    retail_price = float(deal.get("retailPrice", sale_price))
                    deal_url = f"https://www.cheapshark.com/redirect?dealID={deal.get('dealID', '')}"
                    results.append(Offer(canonical_title, store_name, sale_price, "USD", deal_url, "Digital", retail_price, mc_score, mc_url))

                if not results and mc_score is not None:
                    results.append(Offer(canonical_title, "Steam", 0.0, "USD", "", "Digital", None, mc_score, mc_url))
                return results
            except (httpx.HTTPError, ValueError, KeyError):
                return []

class IsThereAnyDealAdapter:
    BASE_URL = "https://api.isthereanydeal.com"
    def __init__(self):
        self.name, self.currency = "IsThereAnyDeal Multi-Store", "USD"
        self.api_key = os.getenv("ITAD_API_KEY", "").strip()
        self.allowed = bool(self.api_key)
        self.user_agent = os.getenv("USER_AGENT", "RadarGamingBot/1.0")
        self.limiter = DomainLimiter(2)

    async def search(self, client: httpx.AsyncClient, query: str) -> list[Offer]:
        if not self.allowed or not query.strip(): return []
        async with self.limiter.for_domain("api.isthereanydeal.com"):
            try:
                lookup = await client.get(f"{self.BASE_URL}/games/search/v1", params={"key": self.api_key, "title": _clean_title(query), "results": 1}, headers={"User-Agent": self.user_agent}, timeout=15)
                lookup.raise_for_status()
                items = lookup.json()
                if not items: return []
                game_uuid, canonical_title = items[0]["id"], items[0].get("title", query)
                prices_resp = await client.post(f"{self.BASE_URL}/games/prices/v2", params={"key": self.api_key, "country": "US", "nondeals": "true"}, json=[game_uuid], headers={"User-Agent": self.user_agent}, timeout=15)
                prices_resp.raise_for_status()
                data = prices_resp.json()
                if not data: return []
                results = []
                for deal in data[0].get("deals", []):
                    shop, price_obj, reg_obj, url = deal.get("shop", {}).get("name"), deal.get("price", {}), deal.get("regular", {}), deal.get("url")
                    if shop and price_obj and url:
                        results.append(Offer(canonical_title, shop, float(price_obj.get("amount", 0)), price_obj.get("currency", "USD"), url, "Digital", float(reg_obj.get("amount", 0)) if reg_obj else None))
                return results
            except (httpx.HTTPError, ValueError, KeyError):
                return []

class HtmlSearchAdapter:
    def __init__(self, name, search_url_template, selectors, currency="CRC", allowed=False):
        self.name, self.template, self.selectors, self.currency, self.allowed = name, search_url_template, selectors, currency, allowed
        self.user_agent = os.getenv("USER_AGENT", "RadarGamingBot/1.0")
        self.limiter = DomainLimiter(2)

    async def search(self, client: httpx.AsyncClient, query: str):
        if not self.allowed: return []
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
                        title_el, price_el, link_el = card.select_one(self.selectors["title"]), card.select_one(self.selectors["price"]), card.select_one(self.selectors["link"])
                        if not (title_el and price_el and link_el and link_el.get("href")): continue
                        match = re.search(r"([0-9]+(?:[.,][0-9]{1,2})?)", price_el.get_text(" ", strip=True).replace(",", ""))
                        if match: results.append(Offer(title_el.get_text(" ", strip=True), self.name, float(match.group(1)), self.currency, urljoin(url, link_el["href"])))
                    return results
                except (httpx.HTTPError, ValueError):
                    if attempt == 2: return []
                    await asyncio.sleep((2 ** attempt) + random.random())
        return []

SOURCE_REGISTRY = {
    "cheapshark": CheapSharkMultiStoreAdapter(allowed=True, exclude_steam=True),
    "itad": IsThereAnyDealAdapter(),
}
