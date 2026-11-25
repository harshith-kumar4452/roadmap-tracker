// Multi-agent Study Planner Orchestration, Sprint Schedule, Interactive Calendar, and Notifications.

const PLAN_KEY = 'rt:study-plan';
const EVENTS_KEY = 'rt:cal-events';
const DONE_DAYS_KEY = 'rt:sprint-done';

const loadJson = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k) || 'null') ?? fallback; } catch { return fallback; }
};
const saveJson = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
};

const dayIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dayIso(dt);
};

const ROLE_MODULES = {
  sde: ['DSA Basics & Arrays', 'Recursion, Trees & Graphs', 'Dynamic Programming', 'OS & Computer Networks', 'DBMS & SQL', 'OOPS & LLD', 'HLD & Mock Interviews'],
  backend: ['Node.js & REST APIs', 'DBMS & SQL Indexing', 'Authentication & Security', 'Redis Caching & Internals', 'Kafka & Async Queues', 'Microservices & HLD', 'Backend Build Projects'],
  data_engineer: ['SQL Window Functions & CTEs', 'Python for Data Pipelines', 'Data Modeling & DBMS', 'Kafka Event Streaming', 'AWS Data Lakes (S3/Glue)', 'ETL Backfills & Quality', 'Pipeline Case Studies'],
  data_analyst: ['SQL Aggregations & Joins', 'Power BI & DAX Modeling', 'Python (Pandas & EDA)', 'Product Metrics & Funnels', 'A/B Testing & Stats', 'Quantitative & Logical Prep', 'Dashboard Case Studies'],
  ai_engineer: ['Python & Linear Algebra', 'Supervised & Unsupervised ML', 'Neural Networks & PyTorch', 'Transformers & Embeddings', 'RAG & Vector Databases', 'LLM Evals & Guardrails', 'AWS Deployment & Serving'],
  frontend: ['Modern JS & Async Patterns', 'React Hooks & State', 'TypeScript & Component Design', 'Performance & Accessibility', 'Backend APIs & Auth', 'SQL & Data Fetching', 'Full Stack Capstone'],
  aptitude: ['Number System & Percentages', 'Ratio, Profit & Averages', 'Time, Work & Probability', 'Logical Reasoning & Puzzles', 'Verbal & Reading Comp', 'DSA Interview Patterns', 'Timed Mock Tests'],
};

function buildOrchestratedPlan({ role, roleLabel, level, hoursPerDay, sprintDays, startDate, targetDate, roadmaps }) {
  const modules = ROLE_MODULES[role] || ROLE_MODULES.sde;
  const pace = hoursPerDay >= 3 ? 2 : hoursPerDay >= 1.5 ? 1 : 1;
  const levelOffset = level === 'Advanced' ? 2 : level === 'Intermediate' ? 1 : 0;
  const orderedModules = modules.slice(levelOffset).concat(modules.slice(0, levelOffset));

  const totalDays = sprintDays * 3; // 3 structured sprints
  const sprints = [];
  const schedule = {}; // iso -> { sprint: 1..3, title, focus, mins, roadmap }

  let modIdx = 0;
  for (let s = 1; s <= 3; s++) {
    const sprintItems = [];
    for (let d = 0; d < sprintDays; d++) {
      const globalDay = (s - 1) * sprintDays + d;
      const date = addDays(startDate, globalDay);
      const isReview = d === sprintDays - 1;
      const focus = isReview
        ? `Sprint ${s} Review & Mock Practice`
        : orderedModules[modIdx % orderedModules.length];
      if (!isReview) modIdx += pace;
      const rm = roadmaps.length ? roadmaps[globalDay % roadmaps.length] : null;
      const entry = {
        date,
        sprint: s,
        dayInSprint: d + 1,
        focus,
        mins: Math.round(hoursPerDay * 60),
        isReview,
        roadmapId: rm?.id || null,
        roadmapTitle: rm?.title || null,
      };
      schedule[date] = entry;
      sprintItems.push(entry);
    }
    sprints.push({
      number: s,
      name: s === 1 ? 'Sprint 1: Foundations' : s === 2 ? 'Sprint 2: Core Depth' : 'Sprint 3: Mastery & Mocks',
      start: sprintItems[0].date,
      end: sprintItems[sprintItems.length - 1].date,
      days: sprintItems,
    });
  }

  return {
    role,
    roleLabel,
    level,
    hoursPerDay,
    sprintDays,
    startDate,
    targetDate: targetDate || '',
    totalDays,
    sprints,
    schedule,
    createdAt: new Date().toISOString(),
  };
}

export function checkTodayNotifications(toastFn) {
  const plan = loadJson(PLAN_KEY, null);
  const events = loadJson(EVENTS_KEY, []);
  const today = dayIso(new Date());
  const todayTask = plan?.schedule?.[today];
  const todayEvents = events.filter((e) => e.date === today);

  const lines = [];
  if (todayTask) lines.push(`Sprint ${todayTask.sprint}: ${todayTask.focus} (${todayTask.mins}m)`);
  if (todayEvents.length) lines.push(`Today's event: ${todayEvents.map((e) => e.title).join(', ')}`);

  if (lines.length && toastFn) {
    toastFn(lines.join(' · '), { label: 'Open Planner', run: () => { location.hash = '#/planner'; } });
  }
  if (lines.length && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Learning hub · Daily Reminder', { body: lines.join('\n') });
    } catch { /* ignore */ }
  }
  return lines;
}

export async function renderPlannerView({ view, api, esc, roles, toast }) {
  const today = dayIso(new Date());
  let plan = loadJson(PLAN_KEY, null);
  let events = loadJson(EVENTS_KEY, []);
  let doneDays = loadJson(DONE_DAYS_KEY, {});
  let calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let selectedDate = today;

  const list = await api('GET', '/roadmaps').catch(() => []);
  const roleChoices = roles.filter((r) => r.id !== 'all');

  const draw = (agentStatus = null) => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const monthLabel = calMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells = [];
    for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-cell empty"></div>');
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const sp = plan?.schedule?.[iso];
      const dayEvents = events.filter((e) => e.date === iso);
      const isDone = Boolean(doneDays[iso]);
      const isToday = iso === today;
      const isSel = iso === selectedDate;
      cells.push(`
        <button type="button" class="cal-cell${isToday ? ' is-today' : ''}${isSel ? ' is-selected' : ''}${isDone ? ' is-done' : ''}${sp ? ` sp-${sp.sprint}` : ''}" data-cal-date="${iso}">
          <span class="cal-num">${d}</span>
          <span class="cal-dots">
            ${sp ? `<i class="cal-dot dot-sp" title="Sprint ${sp.sprint}: ${esc(sp.focus)}"></i>` : ''}
            ${dayEvents.length ? `<i class="cal-dot dot-ev" title="${esc(dayEvents.map((e) => e.title).join(', '))}"></i>` : ''}
          </span>
        </button>`);
    }

    const selPlan = plan?.schedule?.[selectedDate];
    const selEvents = events.filter((e) => e.date === selectedDate);
    const notifPerm = 'Notification' in window ? Notification.permission : 'unsupported';

    const upcomingEvents = events
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);

    view.innerHTML = `
      <header class="page-head">
        <div>
          <p class="eyebrow">Multi-Agent Orchestration</p>
          <h1><span class="material-icons-round">auto_awesome</span> Study Planner &amp; Calendar</h1>
          <p class="muted">Three coordinated agents turn your goal, skill level, and daily hours into timed sprints with calendar tracking and reminders.</p>
        </div>
        <div class="row-actions">
          <button type="button" class="btn small" id="pl-notify-btn">
            <span class="material-icons-round" aria-hidden="true">notifications_active</span>
            ${notifPerm === 'granted' ? 'Test notification' : 'Enable notifications'}
          </button>
        </div>
      </header>

      <!-- Agent Orchestration Pipeline -->
      <section class="panel orch-panel">
        <div class="orch-steps">
          <div class="orch-step ${agentStatus ? (agentStatus.step >= 1 ? 'active' : '') : plan ? 'done' : 'active'}">
            <span class="material-icons-round">psychology</span>
            <div><strong>1. Goal &amp; Intake Agent</strong><span class="muted small">Collects role, level, daily time &amp; exam date</span></div>
          </div>
          <div class="orch-step ${agentStatus ? (agentStatus.step >= 2 ? 'active' : '') : plan ? 'done' : ''}">
            <span class="material-icons-round">view_timeline</span>
            <div><strong>2. Sprint Architect Agent</strong><span class="muted small">Divides syllabus into 3 balanced sprints</span></div>
          </div>
          <div class="orch-step ${agentStatus ? (agentStatus.step >= 3 ? 'active' : '') : plan ? 'done' : ''}">
            <span class="material-icons-round">notifications</span>
            <div><strong>3. Calendar &amp; Notify Agent</strong><span class="muted small">Schedules days &amp; dispatches reminders</span></div>
          </div>
        </div>
        ${agentStatus ? `<p class="orch-live"><span class="spinner" aria-hidden="true"></span>${esc(agentStatus.msg)}</p>` : ''}

        <form id="pl-form" class="orch-form">
          <label>Target Job Role
            <select name="role" required>
              ${roleChoices.map((r) => `<option value="${r.id}"${plan?.role === r.id ? ' selected' : ''}>${esc(r.label)}</option>`).join('')}
            </select>
          </label>
          <label>Current Level
            <select name="level" required>
              ${['Beginner', 'Intermediate', 'Advanced'].map((lv) => `<option value="${lv}"${plan?.level === lv ? ' selected' : ''}>${lv}</option>`).join('')}
            </select>
          </label>
          <label>Daily Study Time
            <select name="hours" required>
              <option value="0.5"${plan?.hoursPerDay === 0.5 ? ' selected' : ''}>30 mins / day</option>
              <option value="1"${!plan || plan?.hoursPerDay === 1 ? ' selected' : ''}>1 hour / day</option>
              <option value="2"${plan?.hoursPerDay === 2 ? ' selected' : ''}>2 hours / day</option>
              <option value="3"${plan?.hoursPerDay === 3 ? ' selected' : ''}>3+ hours / day</option>
            </select>
          </label>
          <label>Sprint Length
            <select name="sprintDays" required>
              <option value="7"${!plan || plan?.sprintDays === 7 ? ' selected' : ''}>7 days (1-week sprints)</option>
              <option value="14"${plan?.sprintDays === 14 ? ' selected' : ''}>14 days (2-week sprints)</option>
            </select>
          </label>
          <label>Target / Exam Date (optional)
            <input type="date" name="targetDate" value="${esc(plan?.targetDate || '')}">
          </label>
          <div class="orch-submit">
            <button type="submit" class="btn primary">${plan ? 'Re-generate Sprint Plan' : 'Run Agents &amp; Build Plan'}</button>
          </div>
        </form>
      </section>

      <!-- Calendar + Selected Day / Sprints -->
      <div class="planner-grid">
        <section class="panel cal-panel">
          <div class="panel-head">
            <h2><span class="material-icons-round" style="font-size:1.1rem;vertical-align:-2px;color:var(--accent)">calendar_month</span> ${esc(monthLabel)}</h2>
            <div class="row-actions">
              <button type="button" class="btn small ghost" id="cal-prev" aria-label="Previous month">&lt;</button>
              <button type="button" class="btn small ghost" id="cal-today">Today</button>
              <button type="button" class="btn small ghost" id="cal-next" aria-label="Next month">&gt;</button>
            </div>
          </div>
          <div class="cal-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
          <div class="cal-grid">${cells.join('')}</div>
          <div class="cal-legend muted small">
            <span><i class="cal-dot dot-sp"></i> Sprint session</span>
            <span><i class="cal-dot dot-ev"></i> Event / Exam</span>
            <span><i class="cal-dot dot-done"></i> Completed</span>
          </div>
        </section>

        <section class="panel day-panel">
          <div class="panel-head">
            <h2>${esc(selectedDate)}</h2>
            ${selPlan ? `<button type="button" class="btn small ${doneDays[selectedDate] ? '' : 'primary'}" id="day-toggle-done">${doneDays[selectedDate] ? 'Completed' : 'Mark day done'}</button>` : ''}
          </div>
          ${selPlan ? `
            <div class="day-sprint-box">
              <span class="pill status-${doneDays[selectedDate] ? 'done' : 'in_progress'}">Sprint ${selPlan.sprint} · Day ${selPlan.dayInSprint}</span>
              <strong>${esc(selPlan.focus)}</strong>
              <span class="muted small">${selPlan.mins} mins scheduled${selPlan.roadmapTitle ? ` · Suggested: <a href="#/r/${esc(selPlan.roadmapId)}">${esc(selPlan.roadmapTitle)}</a>` : ''}</span>
            </div>` : '<p class="muted small">No sprint session on this date yet. Run the planner above or add an exam/event below.</p>'}

          <div class="day-events">
            <h3>Events &amp; Exams</h3>
            ${selEvents.length ? selEvents.map((ev) => `
              <div class="day-ev-row">
                <span class="pill level-${ev.type === 'Exam' ? 'advanced' : 'intermediate'}">${esc(ev.type)}</span>
                <span>${esc(ev.title)}</span>
                <button type="button" class="icon-btn danger" data-del-ev="${esc(ev.id)}" aria-label="Delete event">&times;</button>
              </div>`).join('') : '<p class="muted small">No events on this day.</p>'}
            <form id="ev-form" class="row-actions" style="margin-top:8px">
              <input name="title" placeholder="Add exam, contest, or interview..." required maxlength="100">
              <select name="type">
                <option value="Exam">Exam</option>
                <option value="Interview">Interview</option>
                <option value="Contest">Contest</option>
                <option value="Deadline">Deadline</option>
              </select>
              <button class="btn small primary">Add</button>
            </form>
          </div>

          ${upcomingEvents.length ? `
          <div class="day-events">
            <h3>Upcoming Events</h3>
            ${upcomingEvents.map((ev) => `<div class="muted small">${esc(ev.date)} · <strong>${esc(ev.type)}</strong>: ${esc(ev.title)}</div>`).join('')}
          </div>` : ''}
        </section>
      </div>

      ${plan ? `
      <section class="sprints-wrap">
        <h2 class="h2">${esc(plan.roleLabel)} · 3-Sprint Schedule (${plan.level}, ${plan.hoursPerDay}h/day)</h2>
        <div class="grid">
          ${plan.sprints.map((sp) => {
            const spDone = sp.days.filter((d) => doneDays[d.date]).length;
            return `
              <article class="panel sprint-card">
                <div class="panel-head">
                  <h3>${esc(sp.name)}</h3>
                  <span class="chip">${spDone}/${sp.days.length} days</span>
                </div>
                <p class="muted small">${esc(sp.start)} to ${esc(sp.end)}</p>
                <ul class="sprint-list">
                  ${sp.days.map((d) => `<li class="${doneDays[d.date] ? 'is-done' : ''}"><span>Day ${d.dayInSprint} (${d.date.slice(5)})</span><strong>${esc(d.focus)}</strong></li>`).join('')}
                </ul>
              </article>`;
          }).join('')}
        </div>
      </section>` : ''}
    `;

    // Bind events
    view.querySelector('#cal-prev')?.addEventListener('click', () => { calMonth = new Date(year, month - 1, 1); draw(); });
    view.querySelector('#cal-next')?.addEventListener('click', () => { calMonth = new Date(year, month + 1, 1); draw(); });
    view.querySelector('#cal-today')?.addEventListener('click', () => { calMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1); selectedDate = today; draw(); });

    view.querySelectorAll('[data-cal-date]').forEach((btn) => {
      btn.addEventListener('click', () => { selectedDate = btn.dataset.calDate; draw(); });
    });

    view.querySelector('#day-toggle-done')?.addEventListener('click', () => {
      if (doneDays[selectedDate]) delete doneDays[selectedDate];
      else doneDays[selectedDate] = true;
      saveJson(DONE_DAYS_KEY, doneDays);
      draw();
    });

    view.querySelector('#ev-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      events.push({ id: Date.now().toString(36), date: selectedDate, title: String(fd.get('title') || '').trim(), type: String(fd.get('type') || 'Exam') });
      saveJson(EVENTS_KEY, events);
      toast('Event added to calendar', null, 'success');
      draw();
    });

    view.querySelectorAll('[data-del-ev]').forEach((btn) => {
      btn.addEventListener('click', () => {
        events = events.filter((ev) => ev.id !== btn.dataset.delEv);
        saveJson(EVENTS_KEY, events);
        draw();
      });
    });

    view.querySelector('#pl-notify-btn')?.addEventListener('click', async () => {
      if (!('Notification' in window)) {
        checkTodayNotifications(toast);
        return;
      }
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') toast('Notifications enabled!', null, 'success');
        else toast('Browser notifications blocked; using in-app reminders.', null, 'info');
      }
      const lines = checkTodayNotifications(toast);
      if (!lines.length) toast('No sprint or exam scheduled for today yet.', null, 'info');
      draw();
    });

    view.querySelector('#pl-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const roleId = String(fd.get('role') || 'sde');
      const roleObj = roleChoices.find((r) => r.id === roleId) || roleChoices[0];
      const level = String(fd.get('level') || 'Beginner');
      const hoursPerDay = Number(fd.get('hours') || 1);
      const sprintDays = Number(fd.get('sprintDays') || 7);
      const targetDate = String(fd.get('targetDate') || '');

      draw({ step: 1, msg: `Intake Agent analyzing ${roleObj.label} (${level}, ${hoursPerDay}h/day)...` });
      await new Promise((r) => setTimeout(r, 400));

      draw({ step: 2, msg: `Sprint Architect Agent building 3 × ${sprintDays}-day sprints...` });
      await new Promise((r) => setTimeout(r, 450));

      const roleRoadmaps = list.filter((rm) => roleObj.match.test(rm.title));
      plan = buildOrchestratedPlan({
        role: roleObj.id,
        roleLabel: roleObj.label,
        level,
        hoursPerDay,
        sprintDays,
        startDate: today,
        targetDate,
        roadmaps: roleRoadmaps,
      });
      saveJson(PLAN_KEY, plan);

      if (targetDate) {
        events = events.filter((ev) => ev.id !== 'target-exam');
        events.push({ id: 'target-exam', date: targetDate, title: `${roleObj.label} Target / Exam`, type: 'Exam' });
        saveJson(EVENTS_KEY, events);
      }

      draw({ step: 3, msg: 'Calendar & Notify Agent scheduling sessions and reminders...' });
      await new Promise((r) => setTimeout(r, 350));

      toast('Personalized 3-sprint plan ready!', null, 'success');
      checkTodayNotifications();
      draw();
    });
  };

  draw();
}
