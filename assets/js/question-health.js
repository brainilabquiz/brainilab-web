/* Admin-only review heuristic. Uses verified answer counts, never player scores. */
window.BrainiQuestionHealth = (() => {
  const bands = {easy:[.54,.96], medium:[.34,.86], hard:[.14,.76]};
  const count = value => value !== null && value !== undefined && value !== '' && Number.isInteger(Number(value)) && Number(value)>=0 ? Number(value) : null;
  function bounds(successes, total) {
    if (!total) return [0,1];
    const z=1.96, p=successes/total, den=1+z*z/total;
    const centre=(p+z*z/(2*total))/den;
    const half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/den;
    return [Math.max(0,centre-half),Math.min(1,centre+half)];
  }
  function assess(row, telemetry=null) {
    const result={score:null,label:'No verified data',tone:'neutral',signals:[],notes:[],attempts:null,answered:null,accuracy:null,skipRate:null,range:null};
    if (!row) {result.notes.push('Verified answer statistics are unavailable for this version.');return result;}
    const attempts=count(row.attempts), correct=count(row.correct), skips=count(row.skips);
    if ([attempts,correct,skips].includes(null) || correct+skips>attempts) {
      result.label='Check data';result.notes.push('Counts are missing or inconsistent. No health score has been calculated.');return result;
    }
    const answered=attempts-skips;
    Object.assign(result,{attempts,answered,accuracy:answered?100*correct/answered:null,skipRate:attempts?100*skips/attempts:null});
    result.notes.push('Verified answers: all time. Attempts are not unique players; repeated play can bias this review aid.');
    if (telemetry && telemetry.exit_rate!=null) {
      result.notes.push(`Last 30 days: ${Number(telemetry.exit_rate).toFixed(1)}% estimated exits across ${Number(telemetry.exposures)||0} exposures. Sparse checkpoints cannot identify the exact exit question, so exits do not affect this score.`);
    }
    if (answered<30) {
      result.label='Building sample';
      result.notes.push(`${answered}/30 answered attempts before scoring. Skips are shown separately; a small sample is not evidence of a bad question.`);
      if(attempts>=30 && bounds(skips,attempts)[0]>.20) result.signals.push({reason:'Frequent skips',action:'Check wording and rendering. Collect more answered attempts before scoring.'});
      return result;
    }
    const band=bands[row.difficulty];
    if (!band) {result.label='Check difficulty';result.notes.push('Set a recognised difficulty before comparing accuracy.');return result;}
    const [low,high]=bounds(correct,answered);
    result.range=[100*low,100*high];
    let penalty=0;
    // A signal requires the entire screening range to fall outside the band.
    if(high<band[0]) {
      penalty+=Math.min(55,30+(band[0]-high)*100);
      result.signals.push({reason:'Accuracy below the difficulty range',action:'Check the answer key, ambiguity and explanation; then review the difficulty label.'});
    } else if(low>band[1]) {
      penalty+=20;
      result.signals.push({reason:'Accuracy above the difficulty range',action:'Review the difficulty label and distractors. An easy question can still be useful.'});
    }
    if(bounds(skips,attempts)[0]>.20) {
      penalty+=30;
      result.signals.push({reason:'Frequent skips',action:'Check wording, missing images and mobile rendering before assuming a knowledge gap.'});
    }
    if(answered>=50 && answered-correct>=20 && count(row.weak_distractor_count)>=2) {
      penalty+=15;
      result.signals.push({reason:'At least two rarely chosen distractors',action:'Review whether the incorrect options are plausible. Keep the correct answer unambiguous.'});
    }
    result.score=Math.round(Math.max(0,100-penalty));
    result.label=penalty>=45?'Review first':penalty?'Review suggested':'No strong signal';
    result.tone=penalty>=45?'bad':penalty?'warn':'ok';
    result.notes.push(`Heuristic v2: accuracy excludes skips. ${row.difficulty} screening band ${Math.round(band[0]*100)}–${Math.round(band[1]*100)}%. These thresholds are provisional, not proof of correctness.`);
    return result;
  }
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pct=value=>value==null?'—':`${value.toFixed(1)}%`;
  function render(result) {
    const score=result.score;
    return `<details class="admin-question-health ${esc(result.tone)}"><summary>
      <strong>${score==null?'—':score+'/100'} · ${esc(result.label)}</strong>
      ${score==null?'':`<meter min="0" max="100" value="${score}" aria-label="Question review health">${score}/100</meter>`}
      <span>${result.answered==null?'Answer counts unavailable':`${result.answered} answered · ${result.attempts-result.answered} skipped`}</span>
      <span class="health-disclosure">Why this result?</span></summary>
      <div class="health-explanation"><p>Accuracy excluding skips: <strong>${pct(result.accuracy)}</strong><br/>Skip rate: <strong>${pct(result.skipRate)}</strong></p>
      ${result.signals.length?`<ul>${result.signals.map(s=>`<li><strong>${esc(s.reason)}</strong><br/>${esc(s.action)}</li>`).join('')}</ul>`:'<p>No specific issue established by the available sample. Editorial review still matters.</p>'}
      ${result.notes.map(n=>`<p>${esc(n)}</p>`).join('')}</div></details>`;
  }
  return {assess,render,bounds};
})();
