"""Pipeline IC-3101: secuencial, E/S concurrente y matching CPU paralelo.
Las mediciones formales deben ejecutarse contra snapshots replay reales.
"""
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
from queue import Queue
from time import perf_counter
from statistics import median
from .matching import similarity
import threading


def _score(pair):
    return similarity(pair[0], pair[1])


def _fetch_one(fn):
    try:
        return {"ok": True, "value": fn(), "error": None}
    except Exception as exc:  # el pipeline registra fallos, no oculta la ejecución completa
        return {"ok": False, "value": None, "error": f"{type(exc).__name__}: {exc}"}


def run_pipeline(records, mode="sequential", io_workers=8, cpu_workers=4, queue_size=64):
    if mode not in ("sequential", "concurrent", "parallel"):
        raise ValueError("Modo inválido")
    io_workers, cpu_workers = max(1, int(io_workers)), max(1, int(cpu_workers))
    queue_size = max(1, int(queue_size))
    t0 = perf_counter()
    # Cola acotada entre descubrimiento/lectura de replay y descarga; maxsize aplica backpressure.
    work_queue = Queue(maxsize=queue_size)
    fetched = []
    fetched_lock = threading.Lock()
    sentinel = object()
    fetchers = [r.get("fetcher") for r in records if callable(r.get("fetcher"))]
    def producer():
        for fn in fetchers: work_queue.put(fn)
        for _ in range(1 if mode == "sequential" else io_workers): work_queue.put(sentinel)
    def consumer():
        while True:
            fn=work_queue.get()
            try:
                if fn is sentinel: return
                result=_fetch_one(fn)
                with fetched_lock: fetched.append(result)
            finally: work_queue.task_done()
    t_io=perf_counter()
    if mode == "sequential":
        # Un productor y consumidor en el mismo hilo: una sola tarea a la vez.
        for fn in fetchers:
            work_queue.put(fn)
            item=work_queue.get(); fetched.append(_fetch_one(item)); work_queue.task_done()
    else:
        producer_thread=threading.Thread(target=producer,name="radar-discovery")
        workers=[threading.Thread(target=consumer,name=f"radar-io-{i}") for i in range(io_workers)]
        producer_thread.start()
        for worker in workers: worker.start()
        producer_thread.join()
        work_queue.join()
        for worker in workers: worker.join()
    io_time=perf_counter()-t_io

    pairs=[(r.get("canonical_title", ""), r.get("candidate_title", "")) for r in records]
    t_cpu=perf_counter()
    if mode == "parallel" and pairs:
        with ProcessPoolExecutor(max_workers=cpu_workers) as ex:
            scores=list(ex.map(_score,pairs,chunksize=max(1,len(pairs)//(cpu_workers*4))))
    else:
        scores=[_score(p) for p in pairs]
    cpu_time=perf_counter()-t_cpu
    return {"mode":mode,"items":len(records),"fetch_count":len(fetched),
        "fetch_success":sum(x["ok"] for x in fetched),"fetch_failed":sum(not x["ok"] for x in fetched),
        "fetch_errors":[x["error"] for x in fetched if not x["ok"]],"scores":scores,
        "io_seconds":io_time,"matching_seconds":cpu_time,"total_seconds":perf_counter()-t0,
        "io_workers":1 if mode=="sequential" else io_workers,"cpu_workers":cpu_workers if mode=="parallel" else 1,
        "queue_size":queue_size}


def contention_experiment(n=500_000, workers=8):
    """Mide lock global, acumuladores locales y dict concurrente; reproduce carrera.
    La carrera se fuerza con operaciones read/yield/write para que sea observable.
    """
    n, workers = max(1, int(n)), max(1, int(workers))
    per_worker = n // workers
    def locked():
        total, lock = [0], threading.Lock()
        def work():
            for _ in range(per_worker):
                with lock: total[0] += 1
        ts=[threading.Thread(target=work) for _ in range(workers)]
        t=perf_counter(); [x.start() for x in ts]; [x.join() for x in ts]
        return {"count": total[0], "seconds": perf_counter()-t}
    def local_reduce():
        values=[0]*workers
        def work(i): values[i]=per_worker
        ts=[threading.Thread(target=work,args=(i,)) for i in range(workers)]
        t=perf_counter(); [x.start() for x in ts]; [x.join() for x in ts]
        return {"count": sum(values), "seconds": perf_counter()-t}
    def concurrent_map():
        counts={i:0 for i in range(workers)}
        def work(i):
            for _ in range(per_worker): counts[i]+=1
        ts=[threading.Thread(target=work,args=(i,)) for i in range(workers)]
        t=perf_counter(); [x.start() for x in ts]; [x.join() for x in ts]
        return {"count": sum(counts.values()), "seconds": perf_counter()-t}
    # Carrera intencional: no se sincroniza el read-modify-write compartido.
    shared=[0]
    race_iterations=min(per_worker,2000)
    barrier=threading.Barrier(2)
    def unsafe_worker():
        for _ in range(race_iterations):
            value=shared[0]       # lectura compartida
            barrier.wait()        # ambos hilos leen el mismo valor
            shared[0]=value+1     # una actualización se pierde
    ts=[threading.Thread(target=unsafe_worker) for _ in range(2)]
    t=perf_counter(); [x.start() for x in ts]; [x.join() for x in ts]
    return {"expected_count":per_worker*workers,"global_lock":locked(),
            "local_then_reduce":local_reduce(),"concurrent_dict":concurrent_map(),
            "race_without_lock":{"count":shared[0],"expected_count":race_iterations*2,"seconds":perf_counter()-t,
                                  "note":"Dos hilos leen el mismo contador antes de escribir; la barrera hace reproducible la pérdida de una actualización por iteración."}}


def calculate_metrics(t_sequential, measurements):
    """Calcula speedup absoluto/relativo, eficiencia y Karp-Flatt."""
    result=[]
    for workers, samples in measurements.items():
        med=median(samples); p=int(workers)
        row={"workers":p,"median_seconds":med,"min_seconds":min(samples),"max_seconds":max(samples)}
        row["speedup_absolute"] = t_sequential/med if med else None
        if p == 1:
            row.update(speedup_relative=1.0, efficiency=1.0, karp_flatt=None)
        else:
            t1=median(measurements[1]) if 1 in measurements else None
            sr=t1/med if t1 and med else None
            row["speedup_relative"] = sr
            row["efficiency"] = sr/p if sr is not None else None
            row["karp_flatt"] = ((1/sr)-(1/p))/(1-(1/p)) if sr and sr > 0 else None
        result.append(row)
    return sorted(result,key=lambda x:x["workers"])


def benchmark(replay_runner, worker_values=(1,2,4,8,16,32,64), repetitions=5):
    """Ejecuta una función replay(workers) y devuelve muestras reales; no simula resultados."""
    repetitions=max(5,int(repetitions)); samples={}
    for workers in worker_values:
        samples[int(workers)]=[float(replay_runner(int(workers))) for _ in range(repetitions)]
    return {"repetitions":repetitions,"samples":samples}
