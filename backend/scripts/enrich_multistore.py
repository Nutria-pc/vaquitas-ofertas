import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from app.models import SessionLocal, Game, PriceObservation, ExternalFact
from app.sources import SOURCE_REGISTRY


async def get_usd_to_crc_rate(db) -> float:
    sample = (
        db.query(PriceObservation)
        .filter(PriceObservation.original_currency == "USD", PriceObservation.original_price > 0)
        .first()
    )
    if sample and sample.price_crc and sample.original_price:
        return round(sample.price_crc / sample.original_price, 6)
    return 449.715073


async def fetch_steam_metacritic(client: httpx.AsyncClient, steam_url: str | None) -> tuple[int | None, str | None]:
    if not steam_url:
        return None, None
    m = re.search(r"/app/(\d+)", steam_url)
    if not m:
        return None, None
    appid = m.group(1)
    try:
        r = await client.get(
            "https://store.steampowered.com/api/appdetails",
            params={"appids": appid, "filters": "metacritic"},
            timeout=10,
        )
        if r.status_code == 200:
            payload = r.json().get(appid, {})
            if payload.get("success"):
                mc = payload.get("data", {}).get("metacritic", {})
                score = mc.get("score")
                url = mc.get("url")
                if score and int(score) > 0:
                    return int(score), url
    except Exception:
        pass
    return None, None


async def enrich_all(limit: int = 500):
    db = SessionLocal()
    rate_crc = await get_usd_to_crc_rate(db)
    print(f"Tasa USD->CRC: {rate_crc:,.4f} | Procesando hasta {limit} juegos...")

    adapters = [a for a in SOURCE_REGISTRY.values() if getattr(a, "allowed", False)]
    games = db.query(Game).order_by(Game.id.asc()).limit(limit).all()

    async with httpx.AsyncClient() as client:
        for idx, game in enumerate(games, start=1):
            all_offers = []
            for adapter in adapters:
                offers = await adapter.search(client, game.canonical_title)
                all_offers.extend(offers)

            added_stores = 0
            mc_score = None
            mc_url = None

            for offer in all_offers:
                if offer.metacritic_score and not mc_score:
                    mc_score = offer.metacritic_score
                    mc_url = offer.metacritic_url

                if offer.price <= 0 and offer.store == "Steam":
                    continue

                price_crc = round(offer.price * rate_crc, 2)
                reg_crc = round(offer.regular_price * rate_crc, 2) if offer.regular_price else None

                exists = (
                    db.query(PriceObservation)
                    .filter_by(game_id=game.id, store=offer.store)
                    .first()
                )
                if not exists:
                    db.add(
                        PriceObservation(
                            game_id=game.id,
                            store=offer.store,
                            price_crc=price_crc,
                            regular_price_crc=reg_crc,
                            original_price=offer.price,
                            original_currency=offer.currency,
                            product_url=offer.url,
                            product_format=offer.format,
                            verified=True,
                        )
                    )
                    added_stores += 1

            # Si CheapShark no trajo Metacritic, consultarlo directo por Steam AppID
            if not mc_score:
                steam_obs = (
                    db.query(PriceObservation)
                    .filter_by(game_id=game.id, store="Steam")
                    .first()
                )
                mc_score, mc_url = await fetch_steam_metacritic(
                    client, steam_obs.product_url if steam_obs else None
                )

            if mc_score:
                # Actualizar si existía con fact_type="score" o crear con fact_type="metacritic"
                mc_exists = (
                    db.query(ExternalFact)
                    .filter(
                        ExternalFact.game_id == game.id,
                        ExternalFact.source == "Metacritic",
                    )
                    .first()
                )
                if mc_exists:
                    mc_exists.fact_type = "metacritic"
                    mc_exists.value = str(mc_score)
                    if mc_url:
                        mc_exists.source_url = mc_url
                else:
                    db.add(
                        ExternalFact(
                            game_id=game.id,
                            source="Metacritic",
                            fact_type="metacritic",
                            value=str(mc_score),
                            source_url=mc_url,
                        )
                    )

            db.commit()
            if added_stores > 0 or mc_score or idx % 25 == 0:
                print(
                    f"[{idx}/{len(games)}] {game.canonical_title}: +{added_stores} tiendas | Metacritic: {mc_score or 'N/A'}"
                )
            await asyncio.sleep(0.35)

    db.close()
    print("\nProceso completado para todo el catálogo.")


if __name__ == "__main__":
    lim = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    asyncio.run(enrich_all(limit=lim))
