const byId = id => document.getElementById(id);
let criteria = pregnancyCriteria;
let ratings = [];
let rateButtons = [];
const rubric = byId('rubric');
const filterButton = byId('onlyUnscored');
const progress = byId('examProgress');
let rubricRows = [];
let showUnscored = false;

filterButton.addEventListener('click', () => {
  showUnscored = !showUnscored;
  paintScores();
});
function renderRubric() {
  rubric.replaceChildren();
  ratings = Array(criteria.length).fill(null);
  rateButtons = [];
  rubricRows = [];

  for (const [index, [title, guidance]] of criteria.entries()) {
    const row = document.createElement('section');
    row.className = 'criterion';
    const label = document.createElement('p');
    label.id = 'criterion-' + index;
    label.textContent = title;
    const copy = document.createElement('div');
    copy.className = 'criterion-copy';
    copy.append(label);
    row.append(copy);

    if (guidance) {
      const details = document.createElement('details');
      addText(details, 'summary', activeStation === 'pregnancy' ? 'תשובה צפויה לבוחנת' : 'דגשים להערכה');
      addText(details, 'p', guidance);
      copy.append(details);
    }

    const scores = document.createElement('div');
    scores.className = 'scores';
    scores.setAttribute('role', 'group');
    scores.setAttribute('aria-labelledby', label.id);
    const buttons = [];

    for (let value = 0; value <= 4; value++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = value;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        ratings[index] = ratings[index] === value ? null : value;
        paintScores();
        if (row.hidden) {
          const next = rubricRows.findIndex((item, position) => position > index && !item.hidden);
          const target = next === -1 ? filterButton : rateButtons[next][value];
          target.focus();
        }
      });
      scores.append(button);
      buttons.push(button);
    }

    rateButtons.push(buttons);
    row.append(scores);
    rubricRows.push(row);
    rubric.append(row);
  }
}
function paintScores() {
  rateButtons.forEach((buttons, index) => buttons.forEach((button, value) => {
    button.setAttribute('aria-pressed', String(ratings[index] === value));
  }));
  rubricRows.forEach((row, index) => {
    const marked = ratings[index] !== null;
    row.hidden = showUnscored && marked;
    row.dataset.scored = String(marked);
  });
  filterButton.setAttribute('aria-pressed', String(showUnscored));
  const scored = ratings.filter(value => value !== null);
  progress.max = criteria.length;
  progress.value = scored.length;
  byId('progressText').textContent = `${scored.length} מתוך ${criteria.length} סומנו`;
  byId('filteredEmpty').hidden = !showUnscored || scored.length < criteria.length;
  const total = scored.reduce((sum, value) => sum + value, 0);
  byId('result').textContent = scored.length === criteria.length
    ? `מחוון מלא · ${total} מתוך ${criteria.length * 4} נקודות`
    : `סומנו ${scored.length} מתוך ${criteria.length} סעיפים`;
}
const duration = 12 * 60 * 1000;
let remaining = duration;
let deadline = null;
let interval = null;
function stopTimer() {
  clearInterval(interval);
  interval = null;
  deadline = null;
}
function paintTimer() {
  if (deadline !== null) remaining = Math.max(0, deadline - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  byId('timer').textContent = [Math.floor(seconds / 60), seconds % 60].map(value => String(value).padStart(2, '0')).join(':');
  byId('timer').classList.toggle('expired', remaining === 0);
  if (remaining === 0 && deadline !== null) {
    stopTimer();
    byId('timerStatus').textContent = 'זמן התחנה הסתיים';
  }
  byId('run').disabled = remaining === 0;
  byId('run').textContent = deadline !== null ? 'השהיה' : remaining === duration ? 'התחלת תחנה' : 'המשך';
}
byId('run').addEventListener('click', () => {
  if (deadline !== null) {
    paintTimer();
    if (deadline !== null) {
      stopTimer();
      byId('timerStatus').textContent = 'הטיימר מושהה';
    }
  } else if (remaining > 0) {
    deadline = Date.now() + remaining;
    interval = setInterval(paintTimer, 250);
    byId('timerStatus').textContent = '';
  }
  paintTimer();
});
const resetDialog = byId('resetDialog');
byId('reset').addEventListener('click', () => resetDialog.showModal());
resetDialog.addEventListener('close', () => {
  if (resetDialog.returnValue !== 'reset') return;
  resetDialog.returnValue = '';
  resetStation();
});
function resetStation() {
  stopTimer();
  remaining = duration;
  byId('timerStatus').textContent = '';
  ratings.fill(null);
  showUnscored = false;
  byId('grade').value = '';
  byId('feedback').value = '';
  document.querySelectorAll('details').forEach(details => details.open = false);
  paintScores();
  paintTimer();
}
byId('download').addEventListener('click', () => {
  const lines = [
    'סיכום תחנה — ' + stations[activeStation].title,
    byId('result').textContent,
    ...criteria.map(([title], index) => `${title} — ${ratings[index] ?? 'טרם סומן'}`),
    '',
    'הערכה כוללת — ' + (byId('grade').value || 'טרם נבחרה'),
    '',
    'משוב',
    byId('feedback').value
  ];
  const url = URL.createObjectURL(new Blob(['\uFEFF', lines.join('\r\n')], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'diabetes-' + activeStation + '-summary.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const stationPicker = byId('stationPicker');
const stationButtons = new Map();
const switchDialog = byId('switchDialog');
const casePanel = byId('clinicalCase');
const oralPanel = byId('oral');
const sourcePanel = byId('source');
const pregnancyPanels = [casePanel, oralPanel, sourcePanel].map(panel => panel.innerHTML);
let activeStation = '';
let requestedStation = '';
function addText(parent, tag, value) {
  const element = document.createElement(tag);
  element.textContent = value;
  parent.append(element);
  return element;
}
function addDisclosure(parent, [label, content]) {
  const details = document.createElement('details');
  addText(details, 'summary', label);
  addText(details, 'p', content);
  parent.append(details);
}
function openStation(id) {
  const station = stations[id];
  activeStation = id;
  stationButtons.forEach((button, stationId) => {
    button.setAttribute('aria-pressed', String(stationId === id));
  });
  criteria = station.criteria;
  if (id === 'pregnancy') {
    [casePanel, oralPanel, sourcePanel].forEach((panel, index) => {
      panel.innerHTML = pregnancyPanels[index];
    });
  } else {
    casePanel.replaceChildren();
    addText(casePanel, 'h2', station.title);
    addText(casePanel, 'p', station.intro);
    addText(casePanel, 'p', 'משימת הנבחנת · ' + station.task);
    station.reveals.forEach(item => addDisclosure(casePanel, item));
    oralPanel.replaceChildren();
    addText(oralPanel, 'h2', 'שאלות המשך בעל פה');
    station.oral.forEach(item => addDisclosure(oralPanel, item));
    sourcePanel.replaceChildren();
    addText(sourcePanel, 'h2', 'מקורות קליניים');
    const list = document.createElement('ul');
    for (const [label, url] of station.sources) {
      const item = addText(list, 'li', '');
      const link = addText(item, 'a', label);
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
    }
    sourcePanel.append(list);
  }
  renderRubric();
  resetStation();
}
function requestStation(next) {
  if (next === activeStation) return;
  const started = deadline !== null || remaining !== duration ||
    ratings.some(value => value !== null) || byId('feedback').value || byId('grade').value;
  if (!started) {
    openStation(next);
    return;
  }
  requestedStation = next;
  switchDialog.returnValue = '';
  switchDialog.showModal();
}
for (const [id, station] of Object.entries(stations)) {
  const [topic, subtitle] = station.title.split(' · ');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'station-choice';
  addText(button, 'strong', topic);
  addText(button, 'small', subtitle);
  button.addEventListener('click', () => requestStation(id));
  stationButtons.set(id, button);
  stationPicker.append(button);
}
switchDialog.addEventListener('close', () => {
  if (switchDialog.returnValue === 'switch') openStation(requestedStation);
  stationButtons.get(activeStation).focus();
});
openStation('type1');

