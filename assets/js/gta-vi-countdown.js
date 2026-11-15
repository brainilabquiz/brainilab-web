// GTA VI launch countdown: midnight local time on 19 November 2026 (Rockstar: midnight local time on both launch consoles).
(() => {
  const box = document.querySelector('[data-gta-countdown]');
  if (!box) return;
  const launch = new Date(2026, 10, 19, 0, 0, 0);
  const tiles = box.querySelector('[data-countdown-tiles]');
  const note = box.querySelector('[data-countdown-note]');
  const cell = unit => box.querySelector(`[data-cd="${unit}"]`);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  function tick() {
    const left = launch.getTime() - Date.now();
    if (left <= 0) {
      tiles.hidden = true;
      note.innerHTML = '<strong>Out now</strong> on PS5 and Xbox Series X|S';
      return false;
    }
    const minutes = Math.floor(left / 60000);
    const d = Math.floor(minutes / 1440), h = Math.floor((minutes % 1440) / 60), m = minutes % 60;
    cell('d').textContent = d;
    cell('h').textContent = String(h).padStart(2, '0');
    cell('m').textContent = String(m).padStart(2, '0');
    tiles.hidden = false;
    note.innerHTML = `<span class="gta-visually-hidden">${plural(d, 'day', 'days')}, ${plural(h, 'hour', 'hours')} and ${plural(m, 'minute', 'minutes')} </span>until launch · <strong>19 Nov</strong>, midnight local time`;
    return true;
  }
  if (tick()) setInterval(tick, 30000);
})();
