// Lakshya — script.js (v1.0)
// Features: timer, tasks, subjects/syllabus, journal (password jai bhavani), shloka, ideas, charts, localStorage

// Helpers
const $ = id => document.getElementById(id);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// --- Motivations (15 items) ---
const MOTIVATIONS = [
  'शीलम् परम भूषणम्',
  'वीर भोग्या वसुंधरा',
  'नभः स्पृशं दीप्तम्',
  'Hazaron ki bheed me se ubhar ke aaunga, mujhe me kabiliyat hai mai kar ke dikhaunga',
  'Padhan hai, Phodna hai, Kehar macha dena hai, Aag laga deni hai.',
  'We are not part of the crowd. We are the reason for the crowd.',
  'Discipline is the highest virtue and the key to dominate.',
  'Every minute wasted is NLSIU moving away.',
  'There are many players. Be the game changer.',
  "Lifestyle is important. Live like a commander and you'll become one.",
  'To shine like the Sun, you must burn like the Sun.',
  'Frustrations, Failures, Falls are just preparation to reach the top.',
  'Manzil door hai, lekin jaana jaroor hai.',
  'लक्ष्य यदि सर्वोपरी हो तो आलोचना, विवेचना और प्रशंसा का कोई मूल्य नहीं है।',
  'Work while they waste, Study while they sleep, prepare while they play and rise while they regret.'
];

function todayIndex(){
  // 15-day rotation by absolute date
  const d = new Date();
  const days = Math.floor(d.getTime() / (1000*60*60*24));
  return days % MOTIVATIONS.length;
}

// --- Local Storage Keys ---
const LS = {
  tasks: 'lak_tasks_v1',
  subjects: 'lak_subjects_v1',
  ideas: 'lak_ideas_v1',
  journal: 'lak_journal_v1',
  shloka: 'lak_shloka_v1',
  stats: 'lak_stats_v1'
};

// --- State ---
let state = {
  tasks: JSON.parse(localStorage.getItem(LS.tasks) || '[]'),
  subjects: JSON.parse(localStorage.getItem(LS.subjects) || '[]'),
  ideas: JSON.parse(localStorage.getItem(LS.ideas) || '[]'),
  journal: JSON.parse(localStorage.getItem(LS.journal) || '[]'),
  shloka: localStorage.getItem(LS.shloka) || '',
  stats: JSON.parse(localStorage.getItem(LS.stats) || '{}')
};

// Initialize some stats if empty
if(!state.stats.sessions) state.stats.sessions = {};

// --- UI Bindings ---
const startTimerBtn = $('startTimer'), pauseTimerBtn = $('pauseTimer'), resetTimerBtn = $('resetTimer');
const focusMin = $('focusMin'), breakMin = $('breakMin');
const timerText = $('timerText'), timerSvg = $('timerSvg');
const progressCircle = document.querySelector('circle.progress');
const taskListEl = $('todayTasks');
const addTaskBtn = $('addTask');
const taskTitle = $('taskTitle'), taskSubject = $('taskSubject'), taskDeadline = $('taskDeadline'), taskStatus = $('taskStatus');
const newSubjectName = $('newSubjectName'), addSubjectBtn = $('addSubject'), subjectsContainer = $('subjectsContainer');
const ideasList = $('ideasList'), ideaText = $('ideaText'), saveIdeaBtn = $('saveIdea');
const shlokaArea = $('shlokaArea'), saveShlokaBtn = $('saveShloka'), deleteShlokaBtn = $('deleteShloka');
const motivationEl = $('motivationDay');
const sessionsTodayEl = $('sessionsToday'), tasksDoneTodayEl = $('tasksDoneToday'), syllabusPctEl = $('syllabusPct');
const journalModal = $('journalModal'), openJournalBtn = $('openJournalBtn'), unlockJournalBtn = $('unlockJournal'), journalPwd = $('journalPwd');
const journalPanel = $('journalPanel'), journalAuth = $('journalAuth'), entriesList = $('entriesList'), entryTitle = $('entryTitle'), entryBody = $('entryBody'), saveEntryBtn = $('saveEntry'), closeJournal = $('closeJournal'), lockJournal = $('lockJournal');
const refreshCompletedBtn = $('refreshCompletedBtn');

// Charts placeholders
let pieChart=null, lineChart=null;

// --- Timer Logic ---
let timer = {
  running:false,
  mode:'focus', // focus or break
  remain: 25*60,
  intervalId:null
};

function setTimerVisual(seconds){
  const radius = 52;
  const circumference = 2*Math.PI*radius;
  const total = (timer.mode === 'focus') ? parseInt(focusMin.value || 25)*60 : parseInt(breakMin.value || 5)*60;
  const pct = Math.max(0, Math.min(1, seconds/total));
  const offset = circumference * (1 - pct);
  progressCircle.style.strokeDashoffset = offset;
  timerText.textContent = `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;
}

function startTimer(){
  if(timer.running) return;
  if(!timer.remain) timer.remain = (timer.mode==='focus' ? parseInt(focusMin.value||25)*60 : parseInt(breakMin.value||5)*60);
  timer.running = true;
  timer.intervalId = setInterval(()=>{
    timer.remain -= 1;
    if(timer.remain<=0){
      // switch mode
      if(timer.mode==='focus'){
        timer.mode='break';
        // record a session
        const d = new Date().toISOString().slice(0,10);
        state.stats.sessions[d] = (state.stats.sessions[d]||0) + 1;
        localStorage.setItem(LS.stats, JSON.stringify(state.stats));
        updateStatsUI();
      } else { timer.mode='focus'; }
      timer.remain = (timer.mode==='focus' ? parseInt(focusMin.value||25)*60 : parseInt(breakMin.value||5)*60);
    }
    setTimerVisual(timer.remain);
  },1000);
}

function pauseTimer(){
  timer.running=false; clearInterval(timer.intervalId); timer.intervalId=null;
}
function resetTimer(){
  pauseTimer(); timer.mode='focus'; timer.remain = parseInt(focusMin.value||25)*60; setTimerVisual(timer.remain);
}

// --- Tasks ---
function saveState(){
  localStorage.setItem(LS.tasks, JSON.stringify(state.tasks));
  localStorage.setItem(LS.subjects, JSON.stringify(state.subjects));
  localStorage.setItem(LS.ideas, JSON.stringify(state.ideas));
  localStorage.setItem(LS.journal, JSON.stringify(state.journal));
  localStorage.setItem(LS.shloka, state.shloka);
  localStorage.setItem(LS.stats, JSON.stringify(state.stats));
}

function renderSubjectsDropdown(){
  taskSubject.innerHTML = '';
  const opt = document.createElement('option'); opt.value='general'; opt.textContent='General'; taskSubject.appendChild(opt);
  state.subjects.forEach(s=>{
    const o=document.createElement('option'); o.value=s.id; o.textContent=s.name; taskSubject.appendChild(o);
  });
}

function renderTasks(){
  taskListEl.innerHTML='';
  const todayStr = new Date().toISOString().slice(0,10);
  const todayTasks = state.tasks.filter(t=>!t.deadline || t.deadline===todayStr || new Date(t.deadline).toDateString()===new Date(todayStr).toDateString());
  todayTasks.forEach(t=>{
    const li = document.createElement('li'); li.className='task-item';
    const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:700">${t.title}</div><div class="task-meta">${t.subjectName||'General'} ${t.deadline? ' • '+t.deadline : ''}</div>`;
    const right = document.createElement('div');
    const status = document.createElement('select');
    status.innerHTML = `<option value="not">Not Started</option><option value="half">Half Finished</option><option value="done">Complete</option>`;
    status.value = t.status||'not';
    status.onchange = ()=>{ t.status = status.value; saveState(); updateStatsUI(); renderTasks(); };
    const del = document.createElement('button'); del.className='btn small ghost'; del.textContent='Delete'; del.onclick = ()=>{ state.tasks = state.tasks.filter(x=>x.id!==t.id); saveState(); renderTasks(); updateStatsUI(); };
    right.appendChild(status); right.appendChild(del);
    li.appendChild(left); li.appendChild(right);
    taskListEl.appendChild(li);
  });
}

addTaskBtn.onclick = ()=>{
  const title = taskTitle.value.trim(); if(!title) return alert('Add a title');
  const subjId = taskSubject.value; const subj = state.subjects.find(s=>s.id===subjId);
  const t = { id: uid(), title, deadline: taskDeadline.value||'', subject: subjId, subjectName: subj?subj.name:'General', status: taskStatus.value };
  state.tasks.push(t); saveState(); taskTitle.value=''; taskDeadline.value=''; renderTasks(); updateStatsUI(); renderSubjects();
}

refreshCompletedBtn.onclick = ()=>{
  if(!confirm('Remove all completed tasks?')) return;
  state.tasks = state.tasks.filter(t=>t.status!=='done'); saveState(); renderTasks(); updateStatsUI();
}

// --- Subjects & Syllabus ---
function renderSubjects(){
  subjectsContainer.innerHTML='';
  renderSubjectsDropdown();
  state.subjects.forEach(s=>{
    const card = document.createElement('div'); card.className='card';
    card.style.marginBottom='8px';
    const header = document.createElement('div'); header.className='row space-between';
    const title = document.createElement('h3'); title.textContent = s.name; title.style.margin='0';
    const controls = document.createElement('div'); controls.className='row';
    const addTopicBtn = document.createElement('button'); addTopicBtn.className='btn small'; addTopicBtn.textContent='Add Topic';
    addTopicBtn.onclick = ()=>{
      const tname = prompt('Topic / Chapter name'); if(!tname) return; s.topics.push({ id: uid(), name: tname, done:false }); saveState(); renderSubjects(); updateCharts();
    };
    const delSub = document.createElement('button'); delSub.className='btn small ghost'; delSub.textContent='Delete'; delSub.onclick = ()=>{ if(confirm('Delete subject and topics?')){ state.subjects=state.subjects.filter(x=>x.id!==s.id); saveState(); renderSubjects(); renderSubjectsDropdown(); updateCharts(); } };
    controls.appendChild(addTopicBtn); controls.appendChild(delSub);
    header.appendChild(title); header.appendChild(controls);
    card.appendChild(header);

    const ul = document.createElement('ul'); ul.className='notes-list';
    s.topics.forEach(tp=>{
      const li=document.createElement('li'); li.className='task-item';
      const left = document.createElement('div'); left.innerHTML = `<div style="font-weight:700">${tp.name}</div>`;
      const right = document.createElement('div');
      const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!tp.done; cb.onchange = ()=>{ tp.done = cb.checked; saveState(); renderSubjects(); updateCharts(); };
      const del = document.createElement('button'); del.className='btn small ghost'; del.textContent='✕'; del.onclick = ()=>{ s.topics = s.topics.filter(x=>x.id!==tp.id); saveState(); renderSubjects(); updateCharts(); };
      right.appendChild(cb); right.appendChild(del);
      li.appendChild(left); li.appendChild(right);
      ul.appendChild(li);
    });
    card.appendChild(ul);
    subjectsContainer.appendChild(card);
  });
}

addSubjectBtn.onclick = ()=>{
  const name = newSubjectName.value.trim(); if(!name) return alert('Enter subject name');
  state.subjects.push({ id: uid(), name, topics: [] }); newSubjectName.value=''; saveState(); renderSubjects(); renderSubjectsDropdown(); updateCharts();
}

// --- Ideas & Notes ---
saveIdeaBtn.onclick = ()=>{
  const t = ideaText.value.trim(); if(!t) return; state.ideas.unshift({ id: uid(), text: t, ts: Date.now(), pinned:false }); ideaText.value=''; saveState(); renderIdeas();
}

function renderIdeas(){
  ideasList.innerHTML='';
  state.ideas.forEach(i=>{
    const li=document.createElement('li'); li.className='task-item';
    const left = document.createElement('div'); left.innerHTML=`<div style="font-weight:700">${i.text}</div><div class="task-meta">${new Date(i.ts).toLocaleString()}</div>`;
    const right = document.createElement('div');
    const pin = document.createElement('button'); pin.className='btn small ghost'; pin.textContent = i.pinned? 'Unpin' : 'Pin'; pin.onclick = ()=>{ i.pinned = !i.pinned; state.ideas = state.ideas.sort((a,b)=>b.pinned - a.pinned); saveState(); renderIdeas(); };
    const del = document.createElement('button'); del.className='btn small ghost'; del.textContent='Delete'; del.onclick = ()=>{ state.ideas = state.ideas.filter(x=>x.id!==i.id); saveState(); renderIdeas(); };
    right.appendChild(pin); right.appendChild(del);
    li.appendChild(left); li.appendChild(right);
    ideasList.appendChild(li);
  });
}

// --- Shloka ---
saveShlokaBtn.onclick = ()=>{ state.shloka = shlokaArea.value; saveState(); alert('Saved locally'); }
deleteShlokaBtn.onclick = ()=>{ if(!confirm('Delete shloka?')) return; state.shloka=''; shlokaArea.value=''; saveState(); }

// --- Journal (locked) ---
openJournalBtn.onclick = ()=>{ journalModal.style.display='flex'; journalAuth.style.display='block'; journalPanel.style.display='none'; journalPwd.value=''; }
$('closeJournal').onclick = ()=>{ journalModal.style.display='none'; }
$('lockJournal').onclick = ()=>{ journalPanel.style.display='none'; journalAuth.style.display='block'; journalPwd.value=''; }

unlockJournalBtn.onclick = ()=>{
  const pwd = journalPwd.value || '';
  if(pwd.trim() === 'jai bhavani'){ // unlock
    journalAuth.style.display='none'; journalPanel.style.display='block'; renderJournalEntries();
  } else {
    alert('Incorrect password');
  }
}

saveEntryBtn.onclick = ()=>{
  const t = entryTitle.value.trim() || 'Untitled'; const b = entryBody.value.trim() || '';
  state.journal.unshift({ id: uid(), title: t, body: b, ts: Date.now() }); entryTitle.value=''; entryBody.value=''; saveState(); renderJournalEntries();
}

function renderJournalEntries(){
  entriesList.innerHTML='';
  state.journal.forEach(e=>{
    const li=document.createElement('li'); li.className='task-item';
    const left = document.createElement('div'); left.innerHTML=`<div style="font-weight:700">${e.title}</div><div class="task-meta">${new Date(e.ts).toLocaleString()}</div>`;
    const right = document.createElement('div');
    const view = document.createElement('button'); view.className='btn small'; view.textContent='View'; view.onclick = ()=>{ entryTitle.value=e.title; entryBody.value=e.body; };
    const del = document.createElement('button'); del.className='btn small ghost'; del.textContent='Delete'; del.onclick = ()=>{ if(confirm('Delete entry?')){ state.journal = state.journal.filter(x=>x.id!==e.id); saveState(); renderJournalEntries(); } };
    right.appendChild(view); right.appendChild(del);
    li.appendChild(left); li.appendChild(right);
    entriesList.appendChild(li);
  });
}

// --- Stats and Charts ---
function updateStatsUI(){
  // sessions today
  const today = new Date().toISOString().slice(0,10);
  sessionsTodayEl.textContent = state.stats.sessions[today] || 0;
  // tasks done today
  const done = state.tasks.filter(t=>t.status==='done').length;
  tasksDoneTodayEl.textContent = done;
  // syllabus pct
  const {doneCount,totalCount} = state.subjects.reduce((acc,s)=>{
    acc.totalCount += s.topics.length; acc.doneCount += s.topics.filter(t=>t.done).length; return acc;
  },{doneCount:0,totalCount:0});
  const pct = totalCount? Math.round(100*doneCount/totalCount) : 0;
  syllabusPctEl.textContent = pct + '%';
}

function initCharts(){
  const pieCtx = $('syllabusPie').getContext('2d');
  pieChart = new Chart(pieCtx, { type:'doughnut', data:{labels:['Done','Remaining'], datasets:[{data:[0,100]}]}, options:{plugins:{legend:{position:'bottom'}}}});
  const lineCtx = $('sessionsLine').getContext('2d');
  lineChart = new Chart(lineCtx, { type:'line', data:{labels:[], datasets:[{label:'Pomodoro sessions',data:[]}]}, options:{scales:{y:{beginAtZero:true}}, plugins:{legend:{display:false}}}});
  updateCharts();
}

function updateCharts(){
  const done = state.subjects.reduce((a,s)=>a + s.topics.filter(t=>t.done).length,0);
  const total = state.subjects.reduce((a,s)=>a + s.topics.length,0);
  const rem = Math.max(0, total-done);
  if(pieChart){ pieChart.data.datasets[0].data = [done, rem||1]; pieChart.data.labels = ['Done','Remaining']; pieChart.update(); }

  // sessions line: last 7 days
  const labels = []; const data = []; for(let i=6;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); const key = d.toISOString().slice(0,10); labels.push(d.toLocaleDateString()); data.push(state.stats.sessions[key] || 0); }
  if(lineChart){ lineChart.data.labels = labels; lineChart.data.datasets[0].data = data; lineChart.update(); }
}

// --- Talent & Pattern ---
function renderPatterns(){
  const s = state.stats.sessions; const keys = Object.keys(s).slice(-14); let html = '<ul>';
  const last7 = []; for(let i=6;i>=0;i--){ const d = new Date(); d.setDate(d.getDate()-i); const k = d.toISOString().slice(0,10); last7.push({k,v:s[k]||0}); }
  html += '<li><strong>Last 7 days sessions:</strong> ' + last7.map(x=>x.v).join(' • ') + '</li>';
  const avg = Math.round((Object.values(s).reduce((a,b)=>a+b,0) / Math.max(1,Object.values(s).length)) * 10)/10;
  html += `<li>Average daily sessions: ${avg}</li>`;
  html += '</ul>';
  $('patterns').innerHTML = html;
}

// --- Initial rendering ---
function bootstrap(){
  motivationEl.textContent = MOTIVATIONS[todayIndex()];
  // timer
  timer.remain = parseInt(focusMin.value||25)*60; setTimerVisual(timer.remain);
  startTimerBtn.onclick = startTimer; pauseTimerBtn.onclick = pauseTimer; resetTimerBtn.onclick = resetTimer;
  // load initial
  renderSubjects(); renderTasks(); renderIdeas(); shlokaArea.value = state.shloka || ''; renderSubjectsDropdown(); initCharts(); updateStatsUI(); renderPatterns();
}

bootstrap();

// auto-save shloka on blur
shlokaArea.addEventListener('blur', ()=>{ state.shloka = shlokaArea.value; saveState(); });

// update charts and stats periodically
setInterval(()=>{ updateCharts(); updateStatsUI(); renderPatterns(); }, 3000);

// expose for quick debug
window.Lakshya = { state };
