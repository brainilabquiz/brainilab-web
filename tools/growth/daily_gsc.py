"""Idempotent local daily export. Remote import is a separate verified step."""
import argparse
from datetime import datetime, timedelta, timezone
import hashlib
import json
from zoneinfo import ZoneInfo
import gsc_sync as api
from report_gsc import build_report
from handoff import build_handoff


def run(inventory, now=None):
    now=now or datetime.now(timezone.utc)
    day=now.astimezone(ZoneInfo('Europe/Madrid')).date().isoformat()
    end=now.date()-timedelta(days=3);start=end-timedelta(days=30)
    report_path=api.PRIVATE/'growth-report.json';state_path=api.PRIVATE/'daily-state.json'
    expected={'day':day,'start':start.isoformat(),'end':end.isoformat()}
    if state_path.exists() and report_path.exists():
        state=json.loads(state_path.read_text(encoding='utf-8'))
        sha=hashlib.sha256(report_path.read_bytes()).hexdigest()
        if all(state.get(k)==v for k,v in expected.items()) and state.get('sha256')==sha:
            api.private_write(api.PRIVATE/'codex-handoff.json',build_handoff(json.loads(report_path.read_text(encoding='utf-8'))))
            return {**state,'reused':True,'remoteImport':'Verify separately; reuse does not skip pending import.'}
    api.sync(expected['start'],expected['end'],api.PRIVATE/'growth.sqlite')
    report=build_report(api.PRIVATE/'growth.sqlite',inventory)
    api.private_write(report_path,report)
    api.private_write(api.PRIVATE/'codex-handoff.json',build_handoff(report))
    state={**expected,'sha256':hashlib.sha256(report_path.read_bytes()).hexdigest(),'report':str(report_path),'exportedAt':now.isoformat()}
    api.private_write(state_path,state)
    return {**state,'reused':False,'remoteImport':'Pending verification'}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--inventory',required=True);args=p.parse_args()
    try:print(json.dumps(run(args.inventory)))
    except (RuntimeError,ValueError,OSError,KeyError):
        print('Daily export failed. No successful daily marker was saved. Check the private connector and inventory; do not mark the remote import complete.')
        raise SystemExit(1)
