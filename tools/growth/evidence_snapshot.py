"""Private, dated evidence commits with exact backups and compare-and-swap."""
from datetime import datetime
import hashlib,json,os
from pathlib import Path
import gsc_sync as api

def stamp(value):
    if not isinstance(value,str):raise ValueError('Evidence timestamp must be text')
    parsed=datetime.fromisoformat(value.replace('Z','+00:00'))
    if parsed.tzinfo is None: raise ValueError('Evidence timestamp needs timezone')
    return parsed

def sha(data): return hashlib.sha256(data).hexdigest() if data is not None else 'missing'

def commit(private,name,value,validate,expected):
    private=Path(private);path=private/(name+'-latest.json')
    clean=validate(value);lock=private/(name+'.write-lock')
    fd=os.open(lock,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:
        os.close(fd);before=path.read_bytes() if path.exists() else None
        if sha(before)!=expected: raise ValueError('Evidence changed concurrently')
        if before:
            prior=validate(json.loads(before))
            if stamp(prior['observedAt'])>stamp(clean['observedAt']): raise ValueError('Refusing older evidence')
            backup=private/(name+'-history')/(sha(before)+'.json');backup.parent.mkdir(exist_ok=True)
            if backup.exists():
                if backup.read_bytes()!=before: raise ValueError('History hash mismatch')
            else:
                with os.fdopen(os.open(backup,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600),'wb') as stream: stream.write(before)
        api.private_write(path,clean)
        return clean
    finally: lock.unlink()

def collection_lock(private,name,operation):
    path=Path(private)/(name+'.collection-lock');fd=os.open(path,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
    try:os.close(fd);return operation()
    finally:path.unlink()

def attach(report,private,name,field,validate):
    path=Path(private)/(name+'-latest.json')
    if not path.exists(): return report
    clean=validate(json.loads(path.read_bytes()));old=report.get(field)
    if old and stamp(old['observedAt'])>stamp(clean['observedAt']): return report
    return {**report,field:clean}
