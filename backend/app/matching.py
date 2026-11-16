"""Normalización y Levenshtein puro Python para que el coste CPU sea medible."""
import re

_EDITION = re.compile(r"\b(deluxe|goty|game of the year|definitive|remastered|remaster|edition|standard edition|complete edition|ultimate edition)\b", re.I)
_PLATFORM = re.compile(r"\b(playstation|ps[345]|xbox|switch|nintendo|pc|steam|windows)\b", re.I)

def normalize_title(value: str) -> str:
    value=(value or "").casefold()
    value=_EDITION.sub(" ",value)
    value=_PLATFORM.sub(" ",value)
    value=re.sub(r"[^\wáéíóúñü ]"," ",value,flags=re.UNICODE)
    return " ".join(value.split())

def levenshtein(a: str,b: str) -> int:
    if len(a)<len(b): a,b=b,a
    previous=list(range(len(b)+1))
    for i,ca in enumerate(a,1):
        current=[i]
        for j,cb in enumerate(b,1):
            current.append(min(current[-1]+1,previous[j]+1,previous[j-1]+(ca!=cb)))
        previous=current
    return previous[-1]

def similarity(a: str,b: str) -> float:
    a,b=normalize_title(a),normalize_title(b)
    if not a or not b: return 0.0
    if a==b: return 1.0
    return 1-levenshtein(a,b)/max(len(a),len(b))

def match(canonical: str,candidates: list[str],threshold=.84):
    ranked=sorted(((x,similarity(canonical,x)) for x in candidates),key=lambda x:x[1],reverse=True)
    if not ranked: return {"match":None,"score":0.0,"uncertain":True,"candidates":[]}
    name,score=ranked[0]
    second=ranked[1][1] if len(ranked)>1 else 0.0
    uncertain=abs(score-threshold)<=.05 or (score-second)<=.03
    return {"match":name if score>=threshold and not uncertain else None,
            "score":round(score,4),"uncertain":uncertain,
            "candidates":[{"title":n,"score":round(s,4)} for n,s in ranked[:5]]}
