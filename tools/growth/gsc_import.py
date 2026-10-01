"""Import official GSC performance CSV ZIP exports into private local snapshots.

No API credentials, network requests, publication or concatenation of reporting views.
"""
import argparse
from contextlib import closing
import csv
import hashlib
import io
import json
import math
import sqlite3
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from zipfile import ZipFile


def norm(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value) if not unicodedata.combining(c)).strip().lower()


DIMENSIONS = {
    'data': 'date', 'date': 'date', 'fecha': 'date',
    'consultes principals': 'query', 'top queries': 'query', 'consultas principales': 'query',
    'pagines mes visitades': 'page', 'top pages': 'page', 'paginas principales': 'page',
    'pais': 'country', 'country': 'country',
    'dispositiu': 'device', 'device': 'device', 'dispositivo': 'device',
    'aspecte a la cerca': 'searchAppearance', 'search appearance': 'searchAppearance', 'aparicion en busquedas': 'searchAppearance',
}
METRICS = {'clics': 'clicks', 'clicks': 'clicks', 'impressions': 'impressions', 'impresiones': 'impressions', 'ctr': 'ctr', 'posicio': 'position', 'position': 'position', 'posicion': 'position'}
FILTERS = {'tipus de cerca': 'searchType', 'search type': 'searchType', 'tipo de busqueda': 'searchType', 'data': 'requestedRange', 'date': 'requestedRange', 'fecha': 'requestedRange', 'pagina': 'page', 'page': 'page', 'pais': 'country', 'country': 'country', 'dispositiu': 'device', 'device': 'device', 'dispositivo': 'device', 'consulta': 'query', 'query': 'query'}


def numeric(value, metric):
    v = value.strip().replace('\u00a0', '').replace(' ', '')
    if v in ('', '-', '~', 'N/A'):
        return None
    percent = v.endswith('%')
    if percent:
        v = v[:-1]
    if ',' in v and '.' in v:
        raise ValueError('Ambiguous decimal/thousands separator')
    n = float(v.replace(',', '.'))
    if not math.isfinite(n) or n < 0:
        raise ValueError('Invalid negative/non-finite metric')
    if metric in ('clicks', 'impressions'):
        if not n.is_integer() or percent:
            raise ValueError('Counts must be integers')
        return int(n)
    if metric == 'ctr':
        if not percent:
            raise ValueError('CTR must have an explicit percent sign')
        if n > 100:
            raise ValueError('CTR exceeds 100%')
        return n / 100
    if percent:
        raise ValueError('Position cannot be a percentage')
    return n


def parse_export(path, property_id):
    if not (property_id.startswith('sc-domain:') or property_id.startswith('https://') or property_id.startswith('http://')):
        raise ValueError('Explicit GSC property is required')
    tables, filters, sources = {}, {}, {}
    with ZipFile(path) as z:
        members = [i for i in z.infolist() if not i.is_dir()]
        if len(members) > 20 or sum(i.file_size for i in members) > 25_000_000:
            raise ValueError('Oversized export')
        for member in members:
            if not member.filename.endswith('.csv') or member.file_size > 5_000_000:
                raise ValueError('Only bounded CSV files are accepted')
            data = z.read(member).decode('utf-8-sig')
            dialect = csv.Sniffer().sniff(data[:8192], delimiters=',;')
            reader = csv.reader(io.StringIO(data), dialect)
            headers = next(reader)
            if norm(headers[0]) in ('filtra', 'filter', 'filtro'):
                if filters:
                    raise ValueError('Multiple filter files')
                for row in reader:
                    if not row:
                        continue
                    if len(row) != 2:
                        raise ValueError('Invalid filter row')
                    key = FILTERS.get(norm(row[0]), 'unmapped:'+row[0])
                    if key in filters:
                        raise ValueError('Duplicate filter')
                    filters[key] = row[1]
                continue
            dimension = DIMENSIONS.get(norm(headers[0]))
            columns = [METRICS.get(norm(h)) for h in headers[1:]]
            if dimension is None or set(columns) != {'clicks', 'impressions', 'ctr', 'position'} or len(columns) != 4:
                raise ValueError('Unknown/incomplete schema in '+member.filename)
            if dimension in tables:
                raise ValueError('Duplicate dimension table')
            records, seen = [], set()
            for row in reader:
                if not row:
                    continue
                if len(row) != len(headers) or not row[0] or row[0] in seen:
                    raise ValueError('Invalid or duplicate dimension row')
                seen.add(row[0])
                if dimension == 'date':
                    date.fromisoformat(row[0])
                record = {'value': row[0], **{m: numeric(v, m) for m, v in zip(columns, row[1:])}}
                if record['impressions'] == 0:
                    record['position'] = record['ctr'] = None
                if record['clicks'] is not None and record['impressions'] is not None and record['clicks'] > record['impressions']:
                    raise ValueError('Clicks exceed impressions')
                records.append(record)
            tables[dimension] = sorted(records, key=lambda r: r['value'])
            sources[dimension] = member.filename
    if not {'date', 'query', 'page'} <= tables.keys() or not filters.get('searchType') or not filters.get('requestedRange'):
        raise ValueError('Missing required tables or report filters')
    dates = [r['value'] for r in tables['date']]
    if not dates:
        raise ValueError('No daily records; cannot establish observed period')
    return {'schemaVersion': 1, 'property': property_id, 'filters': filters, 'availablePeriod': {'start': min(dates), 'end': max(dates), 'timezone': 'America/Los_Angeles'}, 'tables': tables, 'csvSources': sources, 'limitations': ['CSV export tables may omit anonymized queries and can be truncated; absence is not zero demand.', 'Daily chart, page rows and query rows are separate aggregations: never add them together.', 'Requested relative range is preserved verbatim; available daily dates are not a six-month history.', 'Zero placeholders in Google exports may represent unavailable data; no-impression CTR/position are normalized to null.']}


def digest(obj):
    return hashlib.sha256(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()


def import_export(path, property_id, captured_at, database):
    snapshot = parse_export(path, property_id)
    raw_hash = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    return import_snapshot(snapshot, captured_at, database, raw_hash)


def import_snapshot(snapshot, captured_at, database, raw_hash):
    stamp = datetime.fromisoformat(captured_at.replace('Z', '+00:00'))
    if stamp.tzinfo is None:
        raise ValueError('Capture time requires timezone')
    captured_at = stamp.astimezone(timezone.utc).isoformat()
    content = {k:v for k,v in snapshot.items() if k not in ('csvSources', 'limitations')}
    snapshot_id = digest(content)
    scope = digest({k: snapshot[k] for k in ('property', 'filters', 'availablePeriod')})
    database = Path(database)
    database.parent.mkdir(parents=True, exist_ok=True)
    with closing(sqlite3.connect(database)) as db, db:
        db.execute('CREATE TABLE IF NOT EXISTS snapshots(id TEXT PRIMARY KEY, scope TEXT NOT NULL, captured_at TEXT NOT NULL, raw_sha256 TEXT NOT NULL, document TEXT NOT NULL)')
        db.execute('CREATE TABLE IF NOT EXISTS current_snapshots(scope TEXT PRIMARY KEY, snapshot_id TEXT NOT NULL, captured_at TEXT NOT NULL)')
        inserted = db.execute('INSERT OR IGNORE INTO snapshots VALUES(?,?,?,?,?)', (snapshot_id, scope, captured_at, raw_hash, json.dumps(snapshot, ensure_ascii=False))).rowcount == 1
        # A re-export can have different ZIP timestamps but identical semantic content.
        db.execute('INSERT INTO current_snapshots VALUES(?,?,?) ON CONFLICT(scope) DO UPDATE SET snapshot_id=excluded.snapshot_id,captured_at=excluded.captured_at WHERE excluded.captured_at>current_snapshots.captured_at', (scope, snapshot_id, captured_at))
    return {'snapshotId': snapshot_id, 'inserted': inserted, 'rawSha256': raw_hash, 'rows': {k:len(v) for k,v in snapshot['tables'].items()}, 'availablePeriod': snapshot['availablePeriod']}


def total(rows, metric):
    return None if any(r[metric] is None for r in rows) else sum(r[metric] for r in rows)


def summarize(snapshot):
    days = snapshot['tables']['date']
    clicks, impressions = total(days, 'clicks'), total(days, 'impressions')
    valid = [r for r in days if r['impressions'] and r['position'] is not None]
    position = sum(r['position']*r['impressions'] for r in valid)/impressions if impressions and sum(r['impressions'] for r in valid)==impressions else None
    return {'clicks': clicks, 'impressions': impressions, 'ctr': clicks/impressions if impressions and clicks is not None else None, 'positionApproximateFromRoundedDailyRows': position, 'queryRows': len(snapshot['tables']['query']), 'visibleQueryImpressions': total(snapshot['tables']['query'], 'impressions'), 'pageRows': len(snapshot['tables']['page'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('zip')
    parser.add_argument('--property', required=True)
    parser.add_argument('--captured-at', required=True)
    parser.add_argument('--database', default=str(Path(__file__).parent/'data/growth.sqlite'))
    args = parser.parse_args()
    print(json.dumps(import_export(args.zip, args.property, args.captured_at, args.database), ensure_ascii=False, indent=2))
