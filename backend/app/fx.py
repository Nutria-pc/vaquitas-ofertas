import os, httpx
from datetime import datetime, timezone

async def usd_crc_rate():
    override = os.getenv("USD_TO_CRC_OVERRIDE")
    if override:
        return {"rate": float(override), "source": "manual override", "observed_at": datetime.now(timezone.utc).isoformat()}
    url = os.getenv("FX_API_URL", "https://open.er-api.com/v6/latest/USD")
    async with httpx.AsyncClient(timeout=12) as client:
        r = await client.get(url)
        r.raise_for_status()
        data = r.json()
    rate = data.get("rates", {}).get("CRC")
    if not rate:
        raise RuntimeError("La fuente de tipo de cambio no devolvió CRC")
    return {"rate": float(rate), "source": url, "observed_at": data.get("time_last_update_utc")}
