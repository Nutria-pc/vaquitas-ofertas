"""Importa juegos reales desde SteamSpy (descubrimiento) y Steam Store (metadatos).
Respeta una pausa entre consultas. Los resultados se guardan como catálogo PC y no
se etiquetan como precios observados de múltiples tiendas.
"""
import argparse, asyncio, sys, time
from datetime import datetime
import httpx
sys.path.insert(0,".")
from app.models import Base,engine,SessionLocal,Game,PriceObservation

STEAMSPY="https://steamspy.com/api.php"
STEAM_DETAILS="https://store.steampowered.com/api/appdetails"

async def get_json(client,url,params):
    for attempt in range(4):
        try:
            r=await client.get(url,params=params); r.raise_for_status(); return r.json()
        except (httpx.HTTPError,ValueError):
            if attempt==3: return None
            await asyncio.sleep(2**attempt)

async def main(limit=500,country="US",pause=1.2):
    Base.metadata.create_all(bind=engine)
    headers={"User-Agent":"RadarGamingBot/1.1 (IC-3101 educational project)"}
    async with httpx.AsyncClient(timeout=30,headers=headers,follow_redirects=True) as client:
        fx=await get_json(client,"https://open.er-api.com/v6/latest/USD",{})
        usd_crc=float((fx or {}).get("rates",{}).get("CRC",0) or 0)
        # SteamSpy documenta 1 request/min para el endpoint all. Una página contiene hasta 1000.
        rows=await get_json(client,STEAMSPY,{"request":"all","page":0})
        if not isinstance(rows,dict) or not rows:
            raise RuntimeError("SteamSpy no devolvió el listado. Reintente más tarde.")
        candidates=[]
        for key,item in rows.items():
            try: appid=int(item.get("appid",key))
            except (TypeError,ValueError): continue
            if item.get("name") and item.get("owners") and item.get("owners")!="0 .. 0":
                candidates.append((appid,item["name"].strip()))
            if len(candidates)>=limit*3: break
        db=SessionLocal(); added=0; skipped=0; failed=[]
        try:
            existing={x[0].casefold() for x in db.query(Game.canonical_title).all()}
            for appid,name in candidates:
                if added>=limit: break
                if name.casefold() in existing: skipped+=1; continue
                data=await get_json(client,STEAM_DETAILS,{"appids":appid,"cc":country.lower(),"l":"english"})
                time.sleep(max(0,pause))
                item=(data or {}).get(str(appid),{})
                if not item.get("success") or not isinstance(item.get("data"),dict): continue
                d=item["data"]
                if d.get("type")!="game": continue
                release=d.get("release_date",{}).get("date")
                release_date=None
                if release:
                    try: release_date=datetime.strptime(release,"%b %d, %Y").date().isoformat()
                    except ValueError: release_date=release
                platforms=d.get("platforms",{})
                platform_names=["PC"] if platforms.get("windows") or platforms.get("mac") or platforms.get("linux") else []
                price=d.get("price_overview",{}) or {}
                final_usd=(price.get("final",0)/100) if price else None
                initial_usd=(price.get("initial",0)/100) if price else None
                msrp_crc=round(initial_usd*usd_crc,2) if initial_usd and usd_crc else None
                game=Game(canonical_title=d.get("name",name),game_type="game",platforms=", ".join(platform_names) or "PC",
                    release_date=release_date,msrp_crc=msrp_crc,cover_url=d.get("header_image"),aliases_json="[]")
                db.add(game); db.flush()
                if final_usd is not None and usd_crc:
                    db.add(PriceObservation(game_id=game.id,store="Steam",price_crc=round(final_usd*usd_crc,2),
                        regular_price_crc=round(initial_usd*usd_crc,2) if initial_usd else None,
                        original_price=final_usd,original_currency="USD",
                        product_url=f"https://store.steampowered.com/app/{appid}/",
                        product_format="Digital",verified=True,stale=False))
                existing.add(game.canonical_title.casefold()); added+=1
                if added%25==0: db.commit(); print(f"Importados {added}/{limit}")
            db.commit()
            print({"added":added,"duplicates":skipped,"candidates":len(candidates),"usd_crc_rate":usd_crc,
                   "note":"Catálogo Steam/PC con precios observados cuando Steam los devuelve. Para cumplir el requisito multiplataforma se necesitan fuentes autorizadas adicionales."})
        finally: db.close()

if __name__=="__main__":
    p=argparse.ArgumentParser(); p.add_argument("--limit",type=int,default=500); p.add_argument("--country",default="US"); p.add_argument("--pause",type=float,default=1.2)
    a=p.parse_args(); asyncio.run(main(a.limit,a.country,a.pause))
