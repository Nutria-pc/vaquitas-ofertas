import asyncio
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import httpx
from app.models import SessionLocal, Game, PriceObservation, ExternalFact
from app.sources import CheapSharkMultiStoreAdapter


async def search_steam_direct(client: httpx.AsyncClient, title: str):
    """Busca el juego directo en Steam Store para obtener su enlace y si es Free-to-Play."""
    try:
        r = await client.get(
            "https://store.steampowered.com/api/storesearch/",
            params={"term": title, "l": "spanish", "cc": "CR"},
            timeout=10,
        )
        if r.status_code != 200:
            return None
        items = r.json().get("items", [])
        if not items:
            return None
        top = items[0]
        appid = top.get("id")
        price_info = top.get("price")
        url = f"https://store.steampowered.com/app/{appid}"
        if not price_info:
            # En Steam StoreSearch, price=None suele indicar Free-to-Play o gratuito
            return {"store": "Steam", "price_usd": 0.0, "regular_usd": 0.0, "url": url, "appid": appid}
        final_usd = round(price_info.get("final", 0) / 100.0, 2)
        initial_usd = round(price_info.get("initial", final_usd * 100) / 100.0, 2)
        return {"store": "Steam", "price_usd": final_usd, "regular_usd": initial_usd, "url": url, "appid": appid}
    except Exception:
        return None


async def fill_all_including_free():
    db = SessionLocal()
    sample = (
        db.query(PriceObservation)
        .filter(PriceObservation.original_currency == "USD", PriceObservation.original_price > 0)
        .first()
    )
    rate_crc = round(sample.price_crc / sample.original_price, 6) if sample else 449.715073

    adapter = CheapSharkMultiStoreAdapter(allowed=True, exclude_steam=False)
    games = db.query(Game).order_by(Game.id.asc()).all()
    updated = 0

    async with httpx.AsyncClient() as client:
        for game in games:
            existing_obs = db.query(PriceObservation).filter_by(game_id=game.id).all()
            # Si ya tiene al menos una observación con URL válida, pasamos
            if any(o.product_url for o in existing_obs):
                continue

            clean_q = re.split(r"[:\-–]", game.canonical_title)[0].strip() or game.canonical_title
            offers = await adapter.search(client, clean_q)

            added = 0
            mc_score = None
            mc_url = None

            for offer in offers:
                if offer.metacritic_score and not mc_score:
                    mc_score = offer.metacritic_score
                    mc_url = offer.metacritic_url

                # Si no trae enlace (ej. dummy sin oferta en CheapShark), saltar aquí y resolver con Steam directo
                if not offer.url:
                    continue

                exists_store = db.query(PriceObservation).filter_by(game_id=game.id, store=offer.store).first()
                if not exists_store:
                    db.add(
                        PriceObservation(
                            game_id=game.id,
                            store=offer.store,
                            price_crc=round(offer.price * rate_crc, 2),
                            regular_price_crc=round(offer.regular_price * rate_crc, 2) if offer.regular_price else None,
                            original_price=offer.price,
                            original_currency=offer.currency,
                            product_url=offer.url,
                            product_format=offer.format,
                            verified=True,
                        )
                    )
                    added += 1

            # Si CheapShark no devolvió ninguna tienda con enlace, buscar directo en Steam (incluye Free-to-Play)
            if added == 0:
                steam_hit = await search_steam_direct(client, clean_q)
                if steam_hit:
                    exists_steam = db.query(PriceObservation).filter_by(game_id=game.id, store="Steam").first()
                    if exists_steam:
                        exists_steam.price_crc = round(steam_hit["price_usd"] * rate_crc, 2)
                        exists_steam.regular_price_crc = round(steam_hit["regular_usd"] * rate_crc, 2)
                        exists_steam.original_price = steam_hit["price_usd"]
                        exists_steam.product_url = steam_hit["url"]
                        exists_steam.verified = True
                    else:
                        db.add(
                            PriceObservation(
                                game_id=game.id,
                                store="Steam",
                                price_crc=round(steam_hit["price_usd"] * rate_crc, 2),
                                regular_price_crc=round(steam_hit["regular_usd"] * rate_crc, 2),
                                original_price=steam_hit["price_usd"],
                                original_currency="USD",
                                product_url=steam_hit["url"],
                                product_format="Digital",
                                verified=True,
                            )
                        )
                    added += 1

            if mc_score:
                exists_mc = db.query(ExternalFact).filter_by(game_id=game.id, fact_type="metacritic").first()
                if not exists_mc:
                    db.add(
                        ExternalFact(
                            game_id=game.id,
                            source="Metacritic",
                            fact_type="metacritic",
                            value=str(mc_score),
                            source_url=mc_url,
                        )
                    )

            if added > 0:
                db.commit()
                updated += 1
                print(f"Actualizado con tienda: {game.canonical_title}")

            await asyncio.sleep(0.35)

    db.close()
    print(f"\nCompletado: {updated} juegos actualizados con tienda de descarga/compra.")


if __name__ == "__main__":
    asyncio.run(fill_all_including_free())
