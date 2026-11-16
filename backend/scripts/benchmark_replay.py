"""Barrido reproducible sobre snapshots reales guardados en backend/replay.
Formato replay/records.json: lista con canonical_title, candidate_title y response_file.
response_file debe apuntar a un HTML/JSON capturado con permiso.
"""
import argparse, json, sys, time
from pathlib import Path
from statistics import median
sys.path.insert(0,".")
from app.pipeline import run_pipeline

ROOT=Path(__file__).resolve().parents[1]

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--latency-ms',type=float,default=50);parser.add_argument('--repetitions',type=int,default=5);parser.add_argument('--workers',default='1,2,4,8,16,32,64');args=parser.parse_args()
    manifest=ROOT/'replay'/'records.json'
    if not manifest.exists(): raise SystemExit('Falta backend/replay/records.json. Agregá capturas reales autorizadas; no se generan resultados sintéticos.')
    raw=json.loads(manifest.read_text(encoding='utf-8'))
    if not isinstance(raw,list) or not raw: raise SystemExit('records.json debe contener una lista no vacía.')
    records=[]
    for row in raw:
        path=(ROOT/'replay'/row['response_file']).resolve()
        if ROOT/'replay' not in path.parents or not path.is_file(): raise SystemExit(f'Snapshot inválido o fuera de replay: {row.get("response_file")}')
        def fetch(p=path,delay=args.latency_ms/1000):
            time.sleep(max(0,delay));return p.read_bytes()
        records.append({'canonical_title':row['canonical_title'],'candidate_title':row['candidate_title'],'fetcher':fetch})
    workers=[int(x) for x in args.workers.split(',') if x.strip()]
    reps=max(5,args.repetitions);results={'snapshot_records':len(records),'latency_ms':args.latency_ms,'repetitions':reps,'modes':{}}
    for mode in ('sequential','concurrent','parallel'):
        results['modes'][mode]={}
        for n in (workers if mode!='sequential' else [1]):
            samples=[];io=[];cpu=[]
            for _ in range(reps):
                r=run_pipeline(records,mode,io_workers=n,cpu_workers=n,queue_size=max(8,n*2))
                samples.append(r['total_seconds']);io.append(r['io_seconds']);cpu.append(r['matching_seconds'])
            results['modes'][mode][str(n)]={'total_median_s':median(samples),'total_min_s':min(samples),'total_max_s':max(samples),'io_median_s':median(io),'matching_median_s':median(cpu),'samples_s':samples}
    tsec=results['modes']['sequential']['1']['total_median_s']
    for mode,table in results['modes'].items():
        t1=table.get('1',{}).get('total_median_s')
        for key,row in table.items():
            p=int(key); sr=(t1/row['total_median_s']) if t1 and row['total_median_s'] else None
            row['speedup_absolute']=tsec/row['total_median_s'] if row['total_median_s'] else None
            row['speedup_relative']=sr
            row['efficiency']=sr/p if sr is not None else None
            row['karp_flatt']=((1/sr)-(1/p))/(1-(1/p)) if p>1 and sr else None
            f=row['karp_flatt']
            row['amdahl_predicted_speedup']=(1/(f+(1-f)/p)) if p>1 and f is not None and 0<=f<=1 else (1.0 if p==1 else None)
    out=ROOT/'replay'/'benchmark-results.json';out.write_text(json.dumps(results,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'output':str(out),'records':len(records),'repetitions':reps},ensure_ascii=False))
if __name__=='__main__':main()
