/* Show the completed puzzle before any network work; only confirmed saves earn progress. */
window.BrainiPuzzleResults = (() => {
  function show(container, {gameId, name, result, next, metrics, guide, summary}) {
    window.BrainiPostGame.mount(container, {gameId, name, result, next, metrics});
    container.querySelector('.post-score-label').textContent = 'rounds solved';
    container.querySelector('.post-message').textContent = summary;
    if (guide) {
      const link = document.createElement('a');
      link.className = 'post-guide';
      link.dataset.postAction = 'guide';
      link.href = guide.href;
      link.textContent = guide.title + ' →';
      container.querySelector('.post-browse').before(link);
    }
    const reward = container.querySelector('[data-result-reward]');
    reward.setAttribute('role', 'status');
    const practice = result.practice || result.tryFirst;
    if (!practice) reward.textContent = 'Saving your result…';
    container.classList.add('puzzle-result-panel');
    container.scrollIntoView?.({block: 'start', behavior: 'instant'});
    let saving = false, saved = false;
    return async function save(payload) {
      if (saving || saved) return null;
      saving = true;
      const timer = !practice ? setTimeout(() => {
        reward.textContent = 'Saving is taking longer than usual. Your result is shown above.';
      }, 8000) : null;
      try {
        const confirmed = await window.BrainiData.api.submitGameResult(gameId, payload);
        if (!confirmed) throw new Error('Result unavailable');
        saved = true;
        Object.assign(result, confirmed);
        reward.dataset.resultReward = practice ? '' : confirmed.clientResultId || '';
        reward.innerHTML = window.BrainiContinuity?.rewardMarkup(confirmed) || '';
        return confirmed;
      } catch {
        reward.textContent = 'Your score is shown above. Progress could not be saved; please check your connection.';
        return null;
      } finally {
        clearTimeout(timer);
        saving = false;
      }
    };
  }
  return {show};
})();
