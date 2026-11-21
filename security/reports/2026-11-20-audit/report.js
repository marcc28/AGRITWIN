(() => {
  const search = document.getElementById('report-search');
  const severity = document.getElementById('severity-filter');
  const tool = document.getElementById('tool-filter');
  const message = document.getElementById('filter-message');
  const entries = [...document.querySelectorAll('[data-entry]')];
  function applyFilters() {
    const term = search.value.trim().toLowerCase();
    let visible = 0;
    for (const entry of entries) {
      const matches = (!term || entry.textContent.toLowerCase().includes(term)) &&
        (severity.value === 'all' || entry.dataset.severity === severity.value) &&
        (tool.value === 'all' || entry.dataset.tool === tool.value);
      entry.hidden = !matches;
      if (matches) visible++;
    }
    for (const group of document.querySelectorAll('[data-result-group]')) {
      group.classList.toggle('group-empty', ![...group.querySelectorAll('[data-entry]')].some(e => !e.hidden));
    }
    const active = term || severity.value !== 'all' || tool.value !== 'all';
    message.textContent = active ? `${visible} matching report entries. Tool totals remain unchanged; packages, alert groups and code candidates are different units.` : 'Filter ZAP rules, npm packages, OSV matches and code candidates. Tool totals remain unchanged.';
  }
  search.addEventListener('input', applyFilters);
  severity.addEventListener('change', applyFilters);
  tool.addEventListener('change', applyFilters);
  document.getElementById('reset-filters').addEventListener('click', () => {
    search.value = ''; severity.value = 'all'; tool.value = 'all'; applyFilters();
  });
  document.getElementById('print-report').addEventListener('click', () => window.print());
  document.getElementById('expand-candidates').addEventListener('click', () => {
    for (const entry of document.querySelectorAll('details.candidate:not([hidden])')) entry.open = true;
  });
  document.getElementById('collapse-candidates').addEventListener('click', () => {
    for (const entry of document.querySelectorAll('details.candidate')) entry.open = false;
  });
  window.addEventListener('beforeprint', () => {
    for (const entry of document.querySelectorAll('details.candidate')) { entry.dataset.wasOpen = String(entry.open); entry.open = true; }
  });
  window.addEventListener('afterprint', () => {
    for (const entry of document.querySelectorAll('details.candidate')) entry.open = entry.dataset.wasOpen === 'true';
  });
  applyFilters();
})();
