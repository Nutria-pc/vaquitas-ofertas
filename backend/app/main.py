from fastapi import FastAPI, Depends, Query, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from .models import Base, engine, SessionLocal, Game, PriceObservation, ExternalFact
from .pipeline import run_pipeline, contention_experiment
from .fx import usd_crc_rate
from .matching import match
from dotenv import load_dotenv
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os, json, time
from pathlib import Path

load_dotenv()
Base.metadata.create_all(bind=engine)
app=FastAPI(title="Radar Gaming API",version="1.1.0",description="Comparador de videojuegos con precios observados e historial")
origins=[x.strip() for x in os.getenv("CORS_ORIGINS","http://localhost:3000").split(",") if x.strip()]
app.add_middleware(CORSMiddleware,allow_origins=origins,allow_credentials=True,allow_methods=["GET","POST"],allow_headers=["*"])

def db_dep():
    db=SessionLocal()
    try: yield db
    finally: db.close()

def admin_guard(x_admin_token: str | None = Header(default=None)):
    expected=os.getenv("ADMIN_TOKEN")
    if not expected:
        if os.getenv("APP_ENV","development").lower()=="production":
            raise HTTPException(503,"ADMIN_TOKEN debe configurarse en producción")
        return True
    if x_admin_token != expected: raise HTTPException(401,"Token administrativo inválido")
    return True

def _best_price(db, game_id):
    return db.query(PriceObservation).filter_by(game_id=game_id,verified=True,stale=False).order_by(PriceObservation.price_crc.asc()).first()

@app.get("/health")
def health(): return {"status":"ok","service":"radar-gaming-api","currency":"CRC","version":"1.1.0"}

@app.get("/games")
def games(q:str|None=None,platform:str|None=None,game_type:str|None=None,store:str|None=None,
          format:str|None=None,sort:str="name",page:int=Query(1,ge=1),page_size:int=Query(24,ge=1,le=100),db:Session=Depends(db_dep)):
    query=db.query(Game)
    if q: query=query.filter(Game.canonical_title.ilike(f"%{q}%"))
    if platform: query=query.filter(Game.platforms.ilike(f"%{platform}%"))
    if game_type: query=query.filter(Game.game_type==game_type)
    if store or format:
        ids=db.query(PriceObservation.game_id).filter(PriceObservation.verified.is_(True),PriceObservation.stale.is_(False))
        if store: ids=ids.filter(PriceObservation.store.ilike(f"%{store}%"))
        if format: ids=ids.filter(PriceObservation.product_format==format)
        query=query.filter(Game.id.in_(ids.subquery()))
    total=query.count()
    if sort=="name": query=query.order_by(Game.canonical_title.asc())
    elif sort=="rating": query=query.order_by(Game.canonical_title.asc()) # rating is external fact, never guessed
    rows=query.offset((page-1)*page_size).limit(page_size).all()
    ids=[g.id for g in rows]
    rating_facts=db.query(ExternalFact).filter(ExternalFact.game_id.in_(ids),ExternalFact.fact_type.in_(["metacritic","opencritic","steam_rating"])).all() if ids else []
    ratings={}
    for fact in rating_facts:
        try: ratings.setdefault(fact.game_id,[]).append(float(fact.value))
        except (TypeError,ValueError): pass
    items=[]
    for g in rows:
        prices=db.query(PriceObservation).filter_by(game_id=g.id,verified=True,stale=False).order_by(PriceObservation.price_crc.asc()).all()
        best=prices[0] if prices else None
        lowest=db.query(func.min(PriceObservation.price_crc)).filter_by(game_id=g.id,verified=True).scalar()
        items.append({"id":g.id,"title":g.canonical_title,"platforms":g.platforms,"game_type":g.game_type,
            "release_date":g.release_date,"cover_url":g.cover_url,"msrp_crc":g.msrp_crc,
            "best_price_crc":best.price_crc if best else None,"best_store":best.store if best else None,
            "best_url":best.product_url if best else None,"best_regular_price_crc":best.regular_price_crc if best else None,
            "price_count":len(prices),"rating":round(sum(ratings[g.id])/len(ratings[g.id]),1) if ratings.get(g.id) else None,
            "discount_pct":round((1-best.price_crc/(best.regular_price_crc or g.msrp_crc))*100,1) if best and (best.regular_price_crc or g.msrp_crc) and (best.regular_price_crc or g.msrp_crc)>0 else None,
            "historical_low":bool(best and lowest is not None and best.price_crc<=lowest)})
    if sort=="price": items.sort(key=lambda x:(x["best_price_crc"] is None,x["best_price_crc"] or float("inf")))
    elif sort=="discount": items.sort(key=lambda x:(x["discount_pct"] is None,-(x["discount_pct"] or 0)))
    elif sort=="rating": items.sort(key=lambda x:(x["rating"] is None,-(x["rating"] or 0)))
    return {"total":total,"page":page,"page_size":page_size,"items":items}

@app.get("/games/{game_id}")
def game_detail(game_id:int,db:Session=Depends(db_dep)):
    g=db.get(Game,game_id)
    if not g: raise HTTPException(404,"Juego no encontrado")
    prices=db.query(PriceObservation).filter_by(game_id=game_id).order_by(PriceObservation.price_crc).all()
    facts=db.query(ExternalFact).filter_by(game_id=game_id).all()
    return {"id":g.id,"title":g.canonical_title,"platforms":g.platforms,"game_type":g.game_type,
        "release_date":g.release_date,"msrp_crc":g.msrp_crc,"cover_url":g.cover_url,
        "aliases":json.loads(g.aliases_json or "[]"),
        "prices":[{"store":p.store,"price_crc":p.price_crc,"regular_price_crc":p.regular_price_crc,
            "original_price":p.original_price,"original_currency":p.original_currency,"url":p.product_url,
            "format":p.product_format,"observed_at":p.observed_at.isoformat(),"verified":p.verified,"stale":p.stale} for p in prices],
        "facts":[{"source":f.source,"type":f.fact_type,"value":f.value,"url":f.source_url,"observed_at":f.observed_at.isoformat()} for f in facts]}

@app.get("/games/{game_id}/history")
def history(game_id:int,db:Session=Depends(db_dep)):
    if not db.get(Game,game_id): raise HTTPException(404,"Juego no encontrado")
    rows=db.query(PriceObservation).filter_by(game_id=game_id).order_by(PriceObservation.observed_at).all()
    return [{"store":p.store,"price_crc":p.price_crc,"observed_at":p.observed_at.isoformat(),"verified":p.verified} for p in rows]

@app.get("/fx/usd-crc")
async def fx():
    try: return await usd_crc_rate()
    except Exception as exc: raise HTTPException(503,f"No se pudo consultar el tipo de cambio: {exc}")

@app.get("/metrics")
def metrics(db:Session=Depends(db_dep)):
    now=datetime.now(timezone.utc); recent=now-timedelta(hours=24)
    return {"games":db.query(func.count(Game.id)).scalar() or 0,
        "price_observations":db.query(func.count(PriceObservation.id)).scalar() or 0,
        "verified_prices":db.query(func.count(PriceObservation.id)).filter_by(verified=True,stale=False).scalar() or 0,
        "stale_prices":db.query(func.count(PriceObservation.id)).filter_by(stale=True).scalar() or 0,
        "unmatched_or_uncertain":db.query(func.count(ExternalFact.id)).filter(ExternalFact.fact_type=="matching_uncertain").scalar() or 0,
        "updated_last_24h":db.query(func.count(PriceObservation.id)).filter(PriceObservation.observed_at>=recent).scalar() or 0,
        "pipeline_modes":["sequential","concurrent","parallel"],
        "last_price_observation":db.query(func.max(PriceObservation.observed_at)).scalar(),
        "warning":"Las métricas de rendimiento deben calcularse con replay real en el equipo de medición."}

@app.post("/admin/run-pipeline",dependencies=[Depends(admin_guard)])
def pipeline(payload:dict):
    replay_root=Path(os.getenv("REPLAY_DIR","./replay")).resolve()
    records=[]
    for row in payload.get("records",[]):
        record={"canonical_title":row.get("canonical_title",""),"candidate_title":row.get("candidate_title","")}
        if row.get("response_file"):
            path=(replay_root/row["response_file"]).resolve()
            if replay_root not in path.parents or not path.is_file(): raise HTTPException(400,"Snapshot replay inválido")
            delay=max(0,float(payload.get("latency_ms",0))/1000)
            record["fetcher"]=lambda p=path,d=delay:(time.sleep(d),p.read_bytes())[1]
        records.append(record)
    return run_pipeline(records,payload.get("mode","sequential"),payload.get("io_workers",8),payload.get("cpu_workers",4),payload.get("queue_size",64))

@app.get("/admin/contention",dependencies=[Depends(admin_guard)])
def contention(n:int=Query(100000,ge=1000,le=5000000),workers:int=Query(8,ge=1,le=64)):
    return contention_experiment(n,workers)

@app.get("/admin/match",dependencies=[Depends(admin_guard)])
def matching(title:str,candidates:list[str]=Query(default=[]),threshold:float=Query(.84,ge=0,le=1)):
    return match(title,candidates,threshold)

@app.post("/admin/mark-stale",dependencies=[Depends(admin_guard)])
def mark_stale(max_age_hours:int=Query(24,ge=1,le=720),db:Session=Depends(db_dep)):
    cutoff=datetime.now(timezone.utc)-timedelta(hours=max_age_hours)
    count=db.query(PriceObservation).filter(PriceObservation.observed_at<cutoff,PriceObservation.stale.is_(False)).update({PriceObservation.stale:True},synchronize_session=False)
    db.commit(); return {"marked_stale":count,"cutoff":cutoff.isoformat()}
