// Interactive agent character ("Pip"): used across the site for study planning,
// answering doubts, custom login prompts, and hiding in a box on the 404 page.

export function buddySvg(mood = 'idle', cls = '') {
  if (mood === 'box') {
    return `
      <svg class="buddy-svg buddy-box ${cls}" viewBox="0 0 160 150" aria-hidden="true">
        <!-- Back flap -->
        <polygon points="34,62 52,44 108,44 126,62" class="box-inside"/>
        <!-- Character peeking from inside the box -->
        <g class="box-peeker">
          <line x1="80" y1="18" x2="80" y2="30" class="b-stroke" stroke-width="3" stroke-linecap="round"/>
          <circle cx="80" cy="14" r="5" class="b-accent"/>
          <rect x="48" y="28" width="64" height="48" rx="22" class="b-head"/>
          <rect x="56" y="38" width="48" height="26" rx="12" class="b-visor"/>
          <g class="b-eyes">
            <circle cx="69" cy="51" r="4.5" class="b-eye"/>
            <circle cx="91" cy="51" r="4.5" class="b-eye"/>
            <circle cx="70" cy="50" r="1.8" class="b-pupil" data-pupil/>
            <circle cx="92" cy="50" r="1.8" class="b-pupil" data-pupil/>
          </g>
          <!-- Little paws gripping box rim -->
          <ellipse cx="52" cy="70" rx="8" ry="5" class="b-hand"/>
          <ellipse cx="108" cy="70" rx="8" ry="5" class="b-hand"/>
        </g>
        <!-- Cardboard box body -->
        <rect x="28" y="68" width="104" height="68" rx="6" class="box-front"/>
        <!-- Left & right open flaps -->
        <polygon points="28,68 14,84 36,92 48,74" class="box-flap"/>
        <polygon points="132,68 146,84 124,92 112,74" class="box-flap"/>
        <!-- Tape & 404 label -->
        <rect x="68" y="68" width="24" height="14" rx="2" class="box-tape"/>
        <text x="80" y="112" text-anchor="middle" class="box-label">404</text>
      </svg>`;
  }

  const mouth = mood === 'happy'
    ? '<path d="M41 50 Q48 57 55 50" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>'
    : mood === 'gate'
      ? '<circle cx="48" cy="51" r="2.8" fill="currentColor"/>'
      : mood === 'thinking'
        ? '<path d="M43 51 H53" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'
        : '<path d="M43 50 Q48 54 53 50" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>';

  const prop = mood === 'gate'
    ? `<g class="b-prop">
         <rect x="68" y="66" width="16" height="13" rx="3" class="b-accent"/>
         <path d="M72 66 v-4 a4 4 0 0 1 8 0 v4" fill="none" stroke="var(--accent-strong)" stroke-width="2.4"/>
       </g>`
    : '';

  return `
    <svg class="buddy-svg buddy-${mood} ${cls}" viewBox="0 0 96 96" aria-hidden="true">
      <!-- Shadow -->
      <ellipse cx="48" cy="88" rx="20" ry="4" class="b-shadow"/>
      <g class="b-body-group">
        <!-- Antenna -->
        <line x1="48" y1="12" x2="48" y2="21" class="b-stroke" stroke-width="2.8" stroke-linecap="round"/>
        <circle cx="48" cy="10" r="4.2" class="b-accent"/>
        <!-- Body -->
        <rect x="30" y="59" width="36" height="22" rx="11" class="b-torso"/>
        <!-- Waving / resting hands -->
        <circle cx="23" cy="67" r="5.5" class="b-hand b-hand-l"/>
        <circle cx="73" cy="67" r="5.5" class="b-hand b-hand-r"/>
        <!-- Head -->
        <rect x="22" y="21" width="52" height="40" rx="18" class="b-head"/>
        <!-- Visor -->
        <rect x="29" y="29" width="38" height="27" rx="11" class="b-visor"/>
        <!-- Eyes -->
        <g class="b-eyes">
          <circle cx="40" cy="40" r="4" class="b-eye"/>
          <circle cx="56" cy="40" r="4" class="b-eye"/>
          <circle cx="40.8" cy="39.5" r="1.7" class="b-pupil" data-pupil/>
          <circle cx="56.8" cy="39.5" r="1.7" class="b-pupil" data-pupil/>
        </g>
        <!-- Mouth -->
        <g class="b-mouth">${mouth}</g>
        ${prop}
      </g>
    </svg>`;
}

const FAQ = [
  {
    match: /plan|today|schedule|study|start/i,
    title: "Today's study plan",
    body: '1. Pick 1 unfinished topic in your active roadmap.\n2. Solve 1 LeetCode or GFG POTD.\n3. Spend 10 mins reviewing a cheat sheet or mindmap.',
    links: [{ label: 'Open Roadmaps', href: '#/roadmaps' }, { label: 'Cheat sheets', href: '#/cheatsheets' }],
  },
  {
    match: /role|job|backend|frontend|sde|cloud|ml|data|aptitude|gate/i,
    title: 'Choosing a job role track',
    body: 'Head to Roadmaps and use the Role chips at the top: Backend Engineer, System Design, SDE / Core CS, Frontend / Full Stack, Cloud / DevOps, Data / ML, or Placement / GATE.',
    links: [{ label: 'Filter by Role', href: '#/roadmaps' }],
  },
  {
    match: /login|sign ?up|account|lock|open|access/i,
    title: 'Accessing roadmaps & links',
    body: 'You can browse the roadmap overview freely. To open a specific roadmap, view resource links, or use cheat sheets and mindmaps, log in or create a free account.',
    links: [{ label: 'Log in', href: '#/login' }, { label: 'Sign up', href: '#/signup' }],
  },
  {
    match: /checkbox|tick|streak|progress|done|status/i,
    title: 'Progress & streaks',
    body: 'Every topic has 3 states: Not started, In progress, and Done. Ticking a topic updates your daily streak and activity heatmap.',
    links: [{ label: 'View Roadmaps', href: '#/roadmaps' }],
  },
  {
    match: /mindmap|cheat|project|404|theme|dark|light/i,
    title: 'Site features',
    body: 'Use the topbar moon/sun icon to switch Light & Dark themes, Mindmaps to visualize topic trees, and Cheat sheets for quick syntax.',
    links: [{ label: 'Mindmaps', href: '#/mindmaps' }, { label: 'Cheat sheets', href: '#/cheatsheets' }],
  },
];

let buddyState = { setMood: null, say: null };

export function buddyReact(mood, text) {
  buddyState.setMood?.(mood);
  if (text) buddyState.say?.(text);
}

export function initBuddy({ getMe, getRoadmaps, replayIntro, startTour }) {
  if (document.querySelector('.buddy-root')) return;

  const root = document.createElement('div');
  root.className = 'buddy-root';
  root.innerHTML = `
    <div class="buddy-panel" hidden role="dialog" aria-label="Pip study assistant">
      <div class="buddy-panel-head">
        <div class="buddy-id">
          <span class="buddy-dot" aria-hidden="true"></span>
          <strong>Pip</strong>
          <span class="muted small">Study buddy</span>
        </div>
        <button type="button" class="icon-btn buddy-close" aria-label="Close assistant">
          <span class="material-icons-round">close</span>
        </button>
      </div>
      <div class="buddy-messages" aria-live="polite">
        <div class="buddy-msg bot">
          <p>Hi! I'm <strong>Pip</strong>. Ask me a doubt, plan today's study, or jump to a roadmap.</p>
        </div>
      </div>
      <div class="buddy-quick">
        <button type="button" class="chip" data-b-q="plan">Plan today</button>
        <button type="button" class="chip" data-b-q="role">Job roles</button>
        <button type="button" class="chip" data-b-q="streak">Streaks</button>
        <button type="button" class="chip" data-b-act="intro">Replay intro</button>
        <button type="button" class="chip" data-b-act="tour">Site tour</button>
      </div>
      <form class="buddy-form">
        <input name="q" type="text" placeholder="Ask a doubt or search a topic..." aria-label="Ask Pip a doubt" autocomplete="off">
        <button class="btn primary small" type="submit" aria-label="Send">
          <span class="material-icons-round">send</span>
        </button>
      </form>
    </div>

    <div class="buddy-bubble" hidden></div>
    <button type="button" class="buddy-fab" aria-expanded="false" aria-label="Open study buddy Pip" title="Ask Pip for help or plan your study">
      ${buddySvg('idle', 'buddy-fab-svg')}
    </button>
  `;
  document.body.appendChild(root);

  const panel = root.querySelector('.buddy-panel');
  const fab = root.querySelector('.buddy-fab');
  const bubble = root.querySelector('.buddy-bubble');
  const msgs = root.querySelector('.buddy-messages');
  const form = root.querySelector('.buddy-form');
  const input = form.querySelector('input');

  panel.hidden = true;
  panel.style.display = 'none';
  bubble.hidden = true;
  bubble.style.display = 'none';

  let bubbleTimer;
  const setMood = (mood) => {
    fab.innerHTML = buddySvg(mood, 'buddy-fab-svg');
  };
  const say = (text) => {
    bubble.textContent = text;
    bubble.hidden = false;
    bubble.style.display = 'block';
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true;
      bubble.style.display = 'none';
    }, 4000);
  };
  buddyState = { setMood, say };

  const togglePanel = (open) => {
    const next = open ?? panel.hidden;
    panel.hidden = !next;
    panel.style.display = next ? 'grid' : 'none';
    fab.setAttribute('aria-expanded', String(next));
    if (next) {
      bubble.hidden = true;
      bubble.style.display = 'none';
      setMood('happy');
      input.focus();
    } else {
      setMood('idle');
    }
  };

  fab.addEventListener('click', (e) => { e.stopPropagation(); togglePanel(); });
  root.querySelector('.buddy-close').addEventListener('click', (e) => { e.stopPropagation(); togglePanel(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) togglePanel(false); });
  document.addEventListener('click', (e) => { if (!panel.hidden && !root.contains(e.target)) togglePanel(false); });

  const appendMsg = (who, html) => {
    const div = document.createElement('div');
    div.className = `buddy-msg ${who}`;
    div.innerHTML = html;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  };

  const answerDoubt = async (query) => {
    const q = query.trim();
    if (!q) return;
    appendMsg('user', `<p>${q.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]))}</p>`);
    setMood('thinking');

    const me = getMe?.() || {};
    const faq = FAQ.find((f) => f.match.test(q));
    if (faq) {
      const linksHtml = faq.links?.length
        ? `<div class="buddy-links">${faq.links.map((l) => `<a class="btn small" href="${l.href}">${l.label}</a>`).join('')}</div>`
        : '';
      appendMsg('bot', `<p><strong>${faq.title}</strong></p><p>${faq.body.replace(/\n/g, '<br>')}</p>${linksHtml}`);
      setMood('happy');
      return;
    }

    // Search roadmaps by title
    const list = (await getRoadmaps?.()) || [];
    const hits = list.filter((r) => r.title.toLowerCase().includes(q.toLowerCase())).slice(0, 4);
    if (hits.length) {
      const linksHtml = hits.map((r) => `<a class="btn small" href="#/r/${r.id}">${r.title}</a>`).join('');
      const note = me.authenticated ? '' : '<p class="muted small">Log in when opening a roadmap to view all its topics & links.</p>';
      appendMsg('bot', `<p>Found ${hits.length} matching roadmap${hits.length > 1 ? 's' : ''}:</p>${note}<div class="buddy-links">${linksHtml}</div>`);
      setMood('happy');
      return;
    }

    appendMsg('bot', `<p>I didn't find an exact match for "<strong>${q.replace(/[<>&]/g, '')}</strong>". Try browsing all roadmaps or filtering by role!</p><div class="buddy-links"><a class="btn small primary" href="#/roadmaps">Browse Roadmaps</a></div>`);
    setMood('idle');
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = input.value;
    input.value = '';
    answerDoubt(val);
  });

  root.querySelectorAll('[data-b-q]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const map = { plan: 'Plan today', role: 'Which role fits me?', streak: 'How do streaks work?' };
      answerDoubt(map[btn.dataset.bQ] || btn.dataset.bQ);
    });
  });

  root.querySelector('[data-b-act="intro"]')?.addEventListener('click', () => {
    togglePanel(false);
    replayIntro?.();
  });
  root.querySelector('[data-b-act="tour"]')?.addEventListener('click', () => {
    togglePanel(false);
    startTour?.();
  });

  // Subtle eye tracking across the page
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && !matchMedia('(hover: none)').matches) {
    let frame = 0;
    window.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const dx = ((e.clientX / innerWidth) - 0.5) * 3.2;
        const dy = ((e.clientY / innerHeight) - 0.5) * 2.4;
        document.querySelectorAll('[data-pupil]').forEach((p) => {
          p.setAttribute('transform', `translate(${dx.toFixed(2)}, ${dy.toFixed(2)})`);
        });
      });
    }, { passive: true });
  }
}
