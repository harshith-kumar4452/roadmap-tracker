// HyperFrames-compatible storytelling timeline & scroll-reveal animations for the landing page.
// Follows the HyperFrames Pause & Register contract: registers a seekable GSAP timeline on
// window.__timelines['landing-story'] with data-composition-id="landing-story".

const CHAPTERS = [
  {
    id: 'scene-chaos',
    num: '01',
    label: 'The Problem',
    title: '30 scattered Notion pages, one quiet place',
    text: 'Playlists, articles, practice sets, and checkboxes used to live across dozens of tabs. Now every roadmap sits in one structured hub.',
    icon: 'layers',
    start: 0,
  },
  {
    id: 'scene-track',
    num: '02',
    label: 'The System',
    title: 'Three-step progress on 1,600+ topics',
    text: 'Move any topic from Not started to In progress to Done, tag its difficulty, and attach private notes right next to the resource link.',
    icon: 'checklist',
    start: 3,
  },
  {
    id: 'scene-streak',
    num: '03',
    label: 'Consistency',
    title: 'Daily POTDs and weekly contests, tracked',
    text: 'Log LeetCode POTD, GFG POTD, and weekend contests in a 4-week routine grid so momentum stays visible.',
    icon: 'local_fire_department',
    start: 6,
  },
  {
    id: 'scene-connect',
    num: '04',
    label: 'The Big Picture',
    title: 'Roadmaps, mindmaps, cheat sheets, and projects',
    text: 'Turn indented outlines into interactive mindmaps, keep Markdown cheat sheets handy, and showcase your coding profile.',
    icon: 'hub',
    start: 9,
  },
];

export function storyHtml({ roadmapsCount, topicsCount, doneCount, streak }) {
  return `
    <section class="story-wrap panel" data-composition-id="landing-story" data-start="0" data-duration="12">
      <div class="story-head">
        <div>
          <p class="eyebrow">How it works</p>
          <h2 class="h2">From scattered playlists to steady progress</h2>
        </div>
        <div class="story-controls" role="group" aria-label="Story playback controls">
          <button type="button" class="btn small ghost" data-story-act="toggle" aria-label="Pause or play animation">
            <span class="material-icons-round" aria-hidden="true">pause</span>
            <span class="story-toggle-label">Pause</span>
          </button>
          <button type="button" class="btn small ghost" data-story-act="replay" aria-label="Replay story">
            <span class="material-icons-round" aria-hidden="true">replay</span>
            <span>Replay</span>
          </button>
        </div>
      </div>

      <div class="story-stage">
        <div class="story-chapters" role="tablist" aria-label="Story chapters">
          ${CHAPTERS.map((c, i) => `
            <button type="button" class="story-chapter${i === 0 ? ' is-active' : ''}" role="tab" aria-selected="${i === 0}" data-story-jump="${c.start}" data-chapter-idx="${i}">
              <span class="story-num">${c.num}</span>
              <span class="story-ch-body">
                <span class="story-ch-label">${c.label}</span>
                <strong>${c.title}</strong>
                <span class="muted small">${c.text}</span>
              </span>
            </button>
          `).join('')}
        </div>

        <div class="story-canvas" aria-hidden="true">
          <div class="story-progress-track"><div class="story-progress-fill"></div></div>

          <!-- Scene 1: Scattered tabs converging -->
          <div class="hf-scene hf-scene-1">
            <div class="hf-tabs">
              <span class="hf-tab hf-tab-a"><span class="material-icons-round">video_library</span>Playlist #14</span>
              <span class="hf-tab hf-tab-b"><span class="material-icons-round">article</span>System Design Notes</span>
              <span class="hf-tab hf-tab-c"><span class="material-icons-round">code</span>DSA Sheet</span>
              <span class="hf-tab hf-tab-d"><span class="material-icons-round">storage</span>DBMS Index</span>
            </div>
            <div class="hf-hub-core">
              <span class="material-icons-round">auto_awesome</span>
              <strong>${roadmapsCount} Roadmaps</strong>
              <span>${topicsCount.toLocaleString()} topics unified</span>
            </div>
          </div>

          <!-- Scene 2: Topic status progression -->
          <div class="hf-scene hf-scene-2">
            <div class="hf-mock-row">
              <span class="hf-mock-check"><span class="material-icons-round">check</span></span>
              <span class="hf-mock-title">Consistent Hashing &amp; Ring Partitioning</span>
              <span class="hf-mock-pill hf-pill-todo">Not started</span>
              <span class="hf-mock-pill hf-pill-prog">In progress</span>
              <span class="hf-mock-pill hf-pill-done">Done</span>
            </div>
            <div class="hf-mock-bar-wrap">
              <div class="hf-mock-bar"><span class="hf-mock-bar-fill"></span></div>
              <span class="hf-mock-stat">${doneCount} / ${topicsCount.toLocaleString()} completed</span>
            </div>
          </div>

          <!-- Scene 3: Daily streak grid -->
          <div class="hf-scene hf-scene-3">
            <div class="hf-streak-head">
              <span class="material-icons-round">local_fire_department</span>
              <strong>${streak || 7}-day momentum</strong>
            </div>
            <div class="hf-streak-grid">
              ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d) => `<span class="hf-day"><span>${d}</span></span>`).join('')}
            </div>
            <div class="hf-streak-tags">
              <span>LeetCode POTD</span>
              <span>GFG POTD</span>
              <span>Weekly Contest</span>
            </div>
          </div>

          <!-- Scene 4: Connected ecosystem -->
          <div class="hf-scene hf-scene-4">
            <div class="hf-node hf-node-center"><span class="material-icons-round">map</span>Roadmaps</div>
            <div class="hf-node hf-node-1"><span class="material-icons-round">psychology</span>Mindmaps</div>
            <div class="hf-node hf-node-2"><span class="material-icons-round">description</span>Cheat sheets</div>
            <div class="hf-node hf-node-3"><span class="material-icons-round">build</span>Projects</div>
            <div class="hf-node hf-node-4"><span class="material-icons-round">person</span>Profile</div>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function initStory(container) {
  const wrap = container?.querySelector('[data-composition-id="landing-story"]');
  if (!wrap) return;

  const chapters = [...wrap.querySelectorAll('.story-chapter')];
  const toggleBtn = wrap.querySelector('[data-story-act="toggle"]');
  const toggleIcon = toggleBtn?.querySelector('.material-icons-round');
  const toggleLabel = toggleBtn?.querySelector('.story-toggle-label');
  const replayBtn = wrap.querySelector('[data-story-act="replay"]');

  const setActiveChapter = (idx) => {
    chapters.forEach((ch, i) => {
      const active = i === idx;
      ch.classList.toggle('is-active', active);
      ch.setAttribute('aria-selected', String(active));
    });
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gsap = window.gsap;

  if (!gsap || reduced) {
    // Graceful static/CSS fallback if GSAP is unavailable or reduced motion is preferred.
    chapters.forEach((btn, i) => {
      btn.addEventListener('click', () => {
        setActiveChapter(i);
        wrap.dataset.activeScene = String(i + 1);
      });
    });
    wrap.dataset.activeScene = '1';
    return;
  }

  // Build deterministic HyperFrames timeline (12s total: 4 scenes x 3s)
  const tl = gsap.timeline({
    paused: true,
    repeat: -1,
    repeatDelay: 0.8,
    onUpdate: () => {
      const t = tl.time();
      const idx = Math.min(3, Math.floor(t / 3));
      setActiveChapter(idx);
    },
  });

  // Progress bar across entire 12s story
  tl.fromTo('.story-progress-fill', { scaleX: 0 }, { scaleX: 1, duration: 12, ease: 'none' }, 0);

  // Scene 1 (0s - 3s): Tabs converge into the unified hub
  tl.set('.hf-scene', { autoAlpha: 0 }, 0)
    .set('.hf-scene-1', { autoAlpha: 1 }, 0)
    .fromTo('.hf-tab-a', { x: -48, y: -24, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.1)
    .fromTo('.hf-tab-b', { x: 48, y: -20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.2)
    .fromTo('.hf-tab-c', { x: -40, y: 24, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.3)
    .fromTo('.hf-tab-d', { x: 40, y: 20, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 0.55, ease: 'power3.out' }, 0.4)
    .to('.hf-tab', { scale: 0.85, opacity: 0.25, duration: 0.5, ease: 'power2.in' }, 1.2)
    .fromTo('.hf-hub-core', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.65, ease: 'back.out(1.6)' }, 1.35)
    .to('.hf-scene-1', { autoAlpha: 0, duration: 0.35 }, 2.65);

  // Scene 2 (3s - 6s): Topic status transitions & progress fill
  tl.set('.hf-scene-2', { autoAlpha: 1 }, 3)
    .fromTo('.hf-mock-row', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 3.05)
    .fromTo('.hf-pill-todo', { opacity: 1, scale: 1 }, { opacity: 0, scale: 0.85, duration: 0.25 }, 3.75)
    .fromTo('.hf-pill-prog', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }, 3.9)
    .to('.hf-pill-prog', { opacity: 0, scale: 0.85, duration: 0.25 }, 4.55)
    .fromTo('.hf-pill-done', { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(1.8)' }, 4.7)
    .fromTo('.hf-mock-check', { backgroundColor: 'transparent', color: 'transparent' }, { backgroundColor: 'var(--accent)', color: 'var(--on-accent)', duration: 0.3 }, 4.7)
    .fromTo('.hf-mock-bar-fill', { scaleX: 0.18 }, { scaleX: 0.72, duration: 0.9, ease: 'power2.out' }, 4.5)
    .to('.hf-scene-2', { autoAlpha: 0, duration: 0.35 }, 5.65);

  // Scene 3 (6s - 9s): Daily streak grid lights up
  tl.set('.hf-scene-3', { autoAlpha: 1 }, 6)
    .fromTo('.hf-streak-head', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }, 6.05)
    .fromTo('.hf-day', { scale: 0.6, opacity: 0.2 }, { scale: 1, opacity: 1, duration: 0.35, stagger: 0.12, ease: 'back.out(1.7)' }, 6.35)
    .fromTo('.hf-streak-tags span', { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, stagger: 0.1, ease: 'power2.out' }, 7.2)
    .to('.hf-scene-3', { autoAlpha: 0, duration: 0.35 }, 8.65);

  // Scene 4 (9s - 12s): Connected ecosystem nodes
  tl.set('.hf-scene-4', { autoAlpha: 1 }, 9)
    .fromTo('.hf-node-center', { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, 9.05)
    .fromTo(['.hf-node-1', '.hf-node-2', '.hf-node-3', '.hf-node-4'], { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.15, ease: 'back.out(1.6)' }, 9.4)
    .to('.hf-scene-4', { autoAlpha: 0, duration: 0.35 }, 11.65);

  // Register on global HyperFrames registry
  window.__timelines = window.__timelines || {};
  window.__timelines['landing-story'] = tl;

  const updateToggleUi = (playing) => {
    if (toggleIcon) toggleIcon.textContent = playing ? 'pause' : 'play_arrow';
    if (toggleLabel) toggleLabel.textContent = playing ? 'Pause' : 'Play';
  };

  toggleBtn?.addEventListener('click', () => {
    if (tl.paused()) {
      tl.play();
      updateToggleUi(true);
    } else {
      tl.pause();
      updateToggleUi(false);
    }
  });

  replayBtn?.addEventListener('click', () => {
    tl.restart();
    updateToggleUi(true);
  });

  chapters.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      const start = Number(btn.dataset.storyJump || 0);
      tl.seek(start + 0.05);
      tl.play();
      setActiveChapter(i);
      updateToggleUi(true);
    });
  });

  // Start playback when visible in viewport
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          tl.play();
          updateToggleUi(true);
        } else {
          tl.pause();
          updateToggleUi(false);
        }
      });
    }, { threshold: 0.25 });
    io.observe(wrap);
  } else {
    tl.play();
    updateToggleUi(true);
  }

  // Scroll-reveal animation for landing sections below the fold
  const revealEls = container.querySelectorAll('.landing-stats, .routine-panel, .section-card');
  if (revealEls.length) {
    gsap.fromTo(
      revealEls,
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.55, stagger: 0.06, ease: 'power2.out', clearProps: 'transform,opacity' },
    );
  }
}


// Storytelling loading/intro overlay shown when opening the home page.
export function playIntro(force = false) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return Promise.resolve();
  try {
    if (!force && sessionStorage.getItem('rt:intro-seen') === '1') return Promise.resolve();
    sessionStorage.setItem('rt:intro-seen', '1');
  } catch { /* storage unavailable */ }

  document.querySelector('.intro-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'intro-overlay';
  overlay.dataset.compositionId = 'intro-loader';
  overlay.dataset.start = '0';
  overlay.dataset.duration = '3.8';
  overlay.setAttribute('role', 'status');
  overlay.setAttribute('aria-label', 'Loading Learning hub');
  overlay.innerHTML = `
    <button type="button" class="btn small ghost intro-skip">Skip intro</button>
    <div class="intro-stage">
      <div class="intro-chips" aria-hidden="true">
        <span class="intro-chip ic-1"><span class="material-icons-round">storage</span>DBMS</span>
        <span class="intro-chip ic-2"><span class="material-icons-round">account_tree</span>DSA</span>
        <span class="intro-chip ic-3"><span class="material-icons-round">hub</span>System Design</span>
        <span class="intro-chip ic-4"><span class="material-icons-round">dns</span>Backend</span>
        <span class="intro-chip ic-5"><span class="material-icons-round">memory</span>OS</span>
        <span class="intro-chip ic-6"><span class="material-icons-round">code</span>React</span>
      </div>
      <div class="intro-beat intro-beat-1">
        <p class="intro-kicker">30 roadmaps · 1,600+ topics</p>
        <h2 class="intro-line">Scattered tabs, brought into one quiet place.</h2>
      </div>
      <div class="intro-beat intro-beat-2">
        <div class="intro-track"><span class="intro-fill"></span></div>
        <p class="intro-sub"><span class="material-icons-round" aria-hidden="true">check_circle</span>Track every topic, routine, and mindmap</p>
      </div>
      <div class="intro-beat intro-beat-3">
        <span class="intro-mark" aria-hidden="true"></span>
        <strong class="intro-brand">Learning hub</strong>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  return new Promise((resolve) => {
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      overlay.remove();
      resolve();
    };

    const gsap = window.gsap;
    if (!gsap) {
      overlay.querySelector('.intro-skip').addEventListener('click', done);
      setTimeout(done, 1600);
      return;
    }

    const tl = gsap.timeline({ paused: true, onComplete: done });
    tl.fromTo('.intro-chip', { scale: 0.7, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, stagger: 0.06, ease: 'back.out(1.6)' }, 0.05)
      .fromTo('.intro-beat-1', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out' }, 0.25)
      .to('.intro-chip', { scale: 0.5, opacity: 0, duration: 0.45, stagger: 0.03, ease: 'power2.in' }, 1.05)
      .to('.intro-beat-1', { y: -12, opacity: 0, duration: 0.35, ease: 'power2.in' }, 1.2)
      .fromTo('.intro-beat-2', { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }, 1.45)
      .fromTo('.intro-fill', { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, 1.55)
      .to('.intro-beat-2', { y: -12, opacity: 0, duration: 0.35, ease: 'power2.in' }, 2.55)
      .fromTo('.intro-beat-3', { scale: 0.88, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(1.6)' }, 2.75)
      .to(overlay, { opacity: 0, y: -24, duration: 0.45, ease: 'power2.inOut' }, 3.4);

    window.__timelines = window.__timelines || {};
    window.__timelines['intro-loader'] = tl;

    overlay.querySelector('.intro-skip').addEventListener('click', () => {
      tl.kill();
      gsap.to(overlay, { opacity: 0, duration: 0.2, onComplete: done });
    });

    tl.play();
  });
}
