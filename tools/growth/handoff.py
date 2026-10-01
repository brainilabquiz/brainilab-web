"""Build an evidence-linked work queue for the authorized Codex heartbeat."""
import hashlib

def build_handoff(report):
    tasks=[];seen=set()
    for lead in report.get('discovery',[]):
        url=lead['url']
        if url in seen:continue
        seen.add(url)
        if not lead.get('queryEvidence'):continue
        tasks.append({'taskId':hashlib.sha256(url.encode()).hexdigest()[:20],
            'url':url,'title':lead['name'],'action':lead['action'],
            'evidenceSnapshot':lead['pageSourceSnapshot'],'period':report['availablePeriod'],
            'evidence':lead['pageEvidence'],'queries':lead['queryEvidence'],
            'instructions':['Read the live page and current Git/Supabase revisions before choosing a change.',
                'Compare the existing proposal and current implementation; do not repeat an already completed improvement.',
                'Research matching intent, make one useful reversible improvement, test and publish through the normal repository workflow.',
                'Only record publication after the public URL and deployment are verified. Preserve the baseline.',
                'Record a reason if evidence does not justify a change. Do not edit merely to satisfy the queue.'],
            'acceptance':['No human changes overwritten','Facts and mechanics verified','Mobile and keyboard checks passed','Public change verified','Original baseline retained']})
    return {'schemaVersion':1,'mode':'automatic_codex','authorization':'Owner explicitly authorized detection, execution and publication on 2026-10-01.',
        'delivery':'Existing Codex chat heartbeat at 09:15 Europe/Madrid; local computer and app required.',
        'maxChangesPerRun':1,'tasks':tasks,'liveStateRequired':True,
        'guard':'Read current opportunities before executing. Skip dismissed, published and monitoring. Resume approved unfinished work before starting another task. Do not infer execution from this queue.'}
