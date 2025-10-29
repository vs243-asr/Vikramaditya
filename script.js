// App: Lakshya
// Fully offline, localStorage-based
// Font: Patrick's Hand | Theme: Blue & White

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

const STORAGE = {
  get: (key, def) => {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : def;
  },
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};

const MOTIVATIONS = [
  "शीलम् परम भूषणम्",
  "वीर भोग्या वसुंधरा",
  "नभः स्पृशं दीप्तम्",
  "Hazaron ki bheed me se ubhar ke aaunga, mujhe me kabiliyat hai mai kar ke dikhaunga",
  "Padhan hai, Phodna hai, Kehar macha dena hai, Aag laga deni hai.",
  "We are not part of the crowd. We are the reason for the crowd.",
  "Discipline is the highest virtue and the key to dominate.",
  "Every minute wasted is NLSIU moving away.",
  "There are many players. Be the game changer.",
  "Lifestyle is important. Live like a commander and you'll become one.",
  "To shine like the Sun, you must burn like the Sun.",
  "Frustrations, Failures, Falls are just preparation to reach the top.",
  "Manzil door hai, lekin jaana jaroor hai.",
  "लक्ष्य यदि सर्वोपरी हो तो आलोचना, विवेचना और प्रशंसा का कोई मूल्य नहीं है।",
  "Work while they waste, Study while they sleep, prepare while they play and rise while they regret."
];

let timerInterval, timerSeconds = 0, isFocus = true, isRunning = false;
let tasks = STORAGE.get('tasks', []);
let subjects = STORAGE.get('subjects', []);
let journal = STORAGE.get('journal', []);
let shloka = STORAGE.get('shloka', '');
let notes = STORAGE.get('notes', []);
let stats = STORAGE.get('stats', { focusTime: 0, sessions: [], tasksDone: [], studyHours: [] });

// Navigation
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.tab').forEach(t => t.classList.remove('active'));
    $(`#${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'analytics') renderAnalytics();
  });
});

// Dashboard
function updateDashboard() {
  const today = new Date().toISOString().split('T')[0];
  $('#today-date').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const todayTasks = tasks.filter(t => t.deadline === today && !t.completed);
  $('#today-tasks').innerHTML = todayTasks.length ? todayTasks.map(t => `<div class="task-item">• ${t.title} (${t.subject})</div>`).join('') : '<p>No tasks for today.</p>';

  $('#timer-display').textContent = isRunning ? $('#timer-text').textContent : 'Off';
  $('#tasks-done').textContent = tasks.filter(t => t.completed).length;
  $('#focus-time').textContent = Math.floor(stats.focusTime / 60) + ' min';

  const dayIndex = Math.floor(Date.now() / 86400000) % 15;
  $('#motivational-quote').textContent = MOTIVATIONS[dayIndex];
}
setInterval(updateDashboard, 1000);
updateDashboard();

// Timer
let focusMin = 25, breakMin = 5;
$('#focus-min').addEventListener('change', (e) => focusMin = +e.target.value);
$('#break-min').addEventListener('change', (e) => breakMin = +e.target.value);

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerSeconds = (isFocus ? focusMin : breakMin) * 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      isFocus = !isFocus;
      $('#timer-mode').textContent = isFocus ? 'Focus Mode' : 'Break Mode';
      startTimer();
      if (isFocus) stats.focusTime += focusMin * 60;
    }
  }, 1000);
}

function updateTimerDisplay() {
  const mins = Math.floor(timerSeconds / 60).toString().padStart(2, '0');
  const secs = (timerSeconds % 60).toString().padStart(2, '0');
  $('#timer-text').textContent = `${mins}:${secs}`;
  const progress = (isFocus ? focusMin * 60 : breakMin * 60) - timerSeconds;
  const total = isFocus ? focusMin * 60 : breakMin * 60;
  const percent = (progress / total) * 283;
  $('#timer-progress').style.strokeDashoffset = 283 - percent;
}

$('#timer-start').onclick = () => { if (!isRunning) startTimer(); };
$('#timer-pause').onclick = () => { clearInterval(timerInterval); isRunning = false; };
$('#timer-reset').onclick = () => { clearInterval(timerInterval); isRunning = false; timerSeconds = focusMin * 60; updateTimerDisplay(); $('#timer-mode').textContent = 'Focus Mode'; isFocus = true; };

// To-Do List
function renderTasks(filter = 'today') {
  const today = new Date().toISOString().split('T')[0];
  let filtered = tasks;
  if (filter === 'today') filtered = tasks.filter(t => t.deadline === today);
  if (filter === 'upcoming') filtered = tasks.filter(t => t.deadline > today);

  $('#task-list').innerHTML = filtered.map((t, i) => `
    <div class="task-item">
      <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTask(${i})">
      <strong>${t.title}</strong> <em>(${t.subject})</em>
      ${t.deadline ? `<small>Due: ${t.deadline}</small>` : ''}
      <select onchange="updateTaskStatus(${i}, this.value)">
        <option value="Not Started" ${t.status==='Not Started'?'selected':''}>Not Started</option>
        <option value="Half Finished" ${t.status==='Half Finished'?'selected':''}>Half Finished</option>
        <option value="Complete" ${t.status==='Complete'?'selected':''}>Complete</option>
      </select>
      <button onclick="deleteTask(${i})" style="float:right; font-size:0.8rem;">×</button>
    </div>
  `).join('');
}

$('#add-task').onclick = () => {
  const title = $('#task-title').value.trim();
  const deadline = $('#task-deadline').value;
  const subject = $('#task-subject').value.trim() || 'General';
  if (!title) return;
  tasks.push({ title, deadline, subject, completed: false, status: 'Not Started' });
  STORAGE.set('tasks', tasks);
  $('#task-title').value = ''; $('#task-deadline').value = ''; $('#task-subject').value = '';
  renderTasks($('.filter-btn.active').dataset.filter);
};

function toggleTask(i) {
  tasks[i].completed = !tasks[i].completed;
  if (tasks[i].completed) tasks[i].status = 'Complete';
  STORAGE.set('tasks', tasks);
  renderTasks($('.filter-btn.active').dataset.filter);
  updateDashboard();
}

function updateTaskStatus(i, status) {
  tasks[i].status = status;
  if (status === 'Complete') tasks[i].completed = true;
  STORAGE.set('tasks', tasks);
  renderTasks($('.filter-btn.active').dataset.filter);
}

function deleteTask(i) {
  tasks.splice(i, 1);
  STORAGE.set('tasks', tasks);
  renderTasks($('.filter-btn.active').dataset.filter);
}

$('#clear-completed').onclick = () => {
  tasks = tasks.filter(t => !t.completed);
  STORAGE.set('tasks', tasks);
  renderTasks($('.filter-btn.active').dataset.filter);
};

$$('.filter-btn').forEach(btn => btn.onclick = () => {
  $$('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks(btn.dataset.filter);
});
renderTasks();

// Syllabus Tracker
function renderSubjects() {
  $('#subjects-list').innerHTML = subjects.map((s, i) => `
    <div class="subject-item">
      <h4>${s.name} <small>(${s.topics.filter(t=>t.done).length}/${s.topics.length})</small></h4>
      <div class="progress-bar"><div style="width:${s.topics.length ? (s.topics.filter(t=>t.done).length / s.topics.length * 100) : 0}%"></div></div>
      <details>
        <summary>Add / Edit Topics</summary>
        <div style="margin-top:10px;">
          <input type="text" id="topic-${i}" placeholder="New topic">
          <button onclick="addTopic(${i})">Add</button>
        </div>
        ${s.topics.map((t, j) => `
          <div>
            <input type="checkbox" ${t.done?'checked':''} onchange="toggleTopic(${i},${j})"> ${t.name}
            <button onclick="deleteTopic(${i},${j})" style="font-size:0.7rem;">×</button>
          </div>
        `).join('')}
      </details>
    </div>
  `).join('');

  const total = subjects.reduce((a, s) => a + s.topics.length, 0);
  const done = subjects.reduce((a, s) => a + s.topics.filter(t=>t.done).length, 0);
  const percent = total ? (done / total * 100) : 0;
  $('#overall-progress-bar').style.width = percent + '%';
  $('#overall-percent').textContent = percent.toFixed(1) + '%';
}

$('#add-subject').onclick = () => {
  const name = $('#new-subject').value.trim();
  if (!name) return;
  subjects.push({ name, topics: [] });
  STORAGE.set('subjects', subjects);
  $('#new-subject').value = '';
  renderSubjects();
};

window.addTopic = (i) => {
  const input = $(`#topic-${i}`);
  const name = input.value.trim();
  if (!name) return;
  subjects[i].topics.push({ name, done: false });
  STORAGE.set('subjects', subjects);
  input.value = '';
  renderSubjects();
};

window.toggleTopic = (i, j) => {
  subjects[i].topics[j].done = !subjects[i].topics[j].done;
  STORAGE.set('subjects', subjects);
  renderSubjects();
};

window.deleteTopic = (i, j) => {
  subjects[i].topics.splice(j, 1);
  STORAGE.set('subjects', subjects);
  renderSubjects();
};

renderSubjects();

// Journal (Password: jai bhavani)
$('#unlock-journal').onclick = () => {
  if ($('#journal-pass').value === 'jai bhavani') {
    $('#journal-lock').classList.add('hidden');
    $('#journal-content').classList.remove('hidden');
    renderJournal();
  } else {
    alert('Incorrect password');
  }
};

function renderJournal() {
  $('#journal-entries').innerHTML = journal.map((e, i) => `
    <div class="journal-entry">
      <small>${new Date(e.date).toLocaleString()}</small>
      <p>${e.text.replace(/\n/g, '<br>')}</p>
      <button onclick="deleteJournal(${i})" style="float:right;">Delete</button>
    </div>
  `).join('');
}

$('#save-entry').onclick = () => {
  const text = $('#journal-entry').value.trim();
  if (!text) return;
  journal.push({ text, date: Date.now() });
  STORAGE.set('journal', journal);
  $('#journal-entry').value = '';
  renderJournal();
};

window.deleteJournal = (i) => {
  journal.splice(i, 1);
  STORAGE.set('journal', journal);
  renderJournal();
};

// Shloka
$('#save-shloka').onclick = () => {
  shloka = $('#shloka-input').value;
  STORAGE.set('shloka', shloka);
  $('#shloka-display').textContent = shloka;
};

$('#clear-shloka').onclick = () => {
  shloka = '';
  STORAGE.set('shloka', shloka);
  $('#shloka-input').value = '';
  $('#shloka-display').textContent = '';
};

$('#shloka-display').textContent = shloka;
$('#shloka-input').value = shloka;

// Notes
function renderNotes() {
  const pinned = notes.filter(n => n.pinned);
  const others = notes.filter(n => !n.pinned);
  $('#notes-list').innerHTML = [...pinned, ...others].map((n, i) => `
    <div class="note-item ${n.pinned ? 'pinned' : ''}">
      <strong>${n.pinned ? '📌 ' : ''}${new Date(n.date).toLocaleString()}</strong>
      <p>${n.text.replace(/\n/g, '<br>')}</p>
      <button onclick="deleteNote(${i})" style="float:right;">×</button>
    </div>
  `).join('');
}

$('#save-note').onclick = () => {
  const text = $('#note-input').value.trim();
  if (!text) return;
  notes.push({ text, date: Date.now(), pinned: $('#pin-note').checked });
  STORAGE.set('notes', notes);
  $('#note-input').value = '';
  $('#pin-note').checked = false;
  renderNotes();
};

window.deleteNote = (i) => {
  notes.splice(i, 1);
  STORAGE.set('notes', notes);
  renderNotes();
};
renderNotes();

// Analytics
function renderAnalytics() {
  // Pie Chart
  const ctx = $('#syllabus-pie').getContext('2d');
  const totalTopics = subjects.reduce((a,s) => a + s.topics.length, 0);
  const doneTopics = subjects.reduce((a,s) => a + s.topics.filter(t=>t.done).length, 0);
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      datasets: [{
        data: [doneTopics, totalTopics - doneTopics],
        backgroundColor: ['#1976d2', '#e0e0e0']
      }]
    },
    options: { responsive: true }
  });

  // Line Chart (Pomodoro sessions last 7 days)
  const lineCtx = $('#weekly-line').getContext('2d');
  const last7 = Array(7).fill(0);
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    last7[6-i] = stats.sessions.filter(s => s === dateStr).length;
  }
  new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: ['-6', '-5', '-4', '-3', '-2', '-1', 'Today'],
      datasets: [{ label: 'Focus Sessions', data: last7, borderColor: '#1976d2', tension: 0.4 }]
    }
  });

  // Weekly Bars
  const weekTasks = tasks.filter(t => {
    if (!t.completed) return false;
    const date = new Date(t.completedDate || t.deadline);
    return date >= new Date(Date.now() - 7*86400000);
  }).length;
  $('#weekly-tasks').style.width = Math.min(weekTasks * 10, 100) + '%';

  const weekHours = stats.studyHours.reduce((a, h) => {
    const date = new Date(h.date);
    return date >= new Date(Date.now() - 7*86400000) ? a + h.hours : a;
  }, 0);
  $('#weekly-hours').style.width = Math.min(weekHours, 100) + '%';

  // Monthly
  const month = new Date().getMonth();
  const monthTasks = tasks.filter(t => t.completed && new Date(t.completedDate).getMonth() === month).length;
  const monthHours = stats.studyHours.filter(h => new Date(h.date).getMonth() === month).reduce((a,h) => a + h.hours, 0);
  const activeDays = new Set(stats.sessions.map(s => s.split('T')[0])).size;

  $('#monthly-tasks').textContent = monthTasks;
  $('#monthly-hours').textContent = monthHours.toFixed(1);
  $('#consistency').textContent = activeDays;
}

// Load Chart.js
const script = document.createElement('script');
script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
script.onload = () => renderAnalytics();
document.head.appendChild(script);

// Save stats on unload
window.addEventListener('beforeunload', () => {
  STORAGE.set('stats', stats);
  STORAGE.set('tasks', tasks);
  STORAGE.set('subjects', subjects);
  STORAGE.set('journal', journal);
  STORAGE.set('shloka', shloka);
  STORAGE.set('notes', notes);
});
