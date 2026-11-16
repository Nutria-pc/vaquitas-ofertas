"""Lee snapshots reales guardados por el equipo para reproducir respuestas offline."""
from pathlib import Path
import json

class ReplayStore:
    def __init__(self, directory=None):
        self.directory=Path(directory or "./replay")
    def load(self):
        if not self.directory.exists(): return []
        records=[]
        for path in sorted(self.directory.glob("*.json")):
            try:
                data=json.loads(path.read_text(encoding="utf-8"))
                if isinstance(data,list): records.extend(data)
                elif isinstance(data,dict): records.append(data)
            except (OSError,json.JSONDecodeError):
                continue
        return records
