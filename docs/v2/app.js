const STORAGE_KEY = 'live_pro_v2_state';

const defaultState = {
  contacts: [
    { name: 'Elena Park', company: 'Stripe', title: 'Director, Product', tie: 'moderate_weak', lastTouchDays: 410, mutuals: 8, referralPotential: 'high' },
    { name: 'Marcus Lee', company: 'Datadog', title: 'Staff PM', tie: 'weak', lastTouchDays: 250, mutuals: 3, referralPotential: 'medium' },
    { name: 'Nadia Romero', company: 'OpenAI', title: 'Recruiting Lead', tie: 'warm', lastTouchDays: 38, mutuals: 14, referralPotential: 'high' },
    { name: 'Thomas Avery', company: 'Figma', title: 'Design Manager', tie: 'weak', lastTouchDays: 620, mutuals: 2, referralPotential: 'medium' },
    { name: 'Priya Desai', company: 'Atlassian', title: 'Engineering Manager', tie: 'moderate_weak', lastTouchDays: 120, mutuals: 7, referralPotential: 'high' },
    { name: 'Jordan Bell', company: 'Notion', title: 'Product Operations', tie: 'weak', lastTouchDays: 540, mutuals: 1, referralPotential: 'low' },
    { name: 'Mina Sato', company: 'Anthropic', title: 'Research Ops', tie: 'moderate_weak', lastTouchDays: 188, mutuals: 5, referralPotential: 'medium' }
  ],
  applications: [
    { id: 'a1', company: 'Stripe', role: 'Senior Product Manager', source: 'Referral', stage: 'Screen', appliedDate: '2026-02-12', followUpDate: '2026-03-10', notes: 'Warm intro via Elena.' },
    { id: 'a2', company: 'Notion', role: 'Product Operations Lead', source: 'Direct Apply', stage: 'Applied', appliedDate: '2026-02-26', followUpDate: '2026-03-08', notes: 'Need short follow-up on recruiter message.' },
    { id: 'a3', company: 'OpenAI', role: 'Program Manager', source: 'Recruiter', stage: 'Interview', appliedDate: '2026-02-05', followUpDate: '2026-03-12', notes: 'Prep system-design style case.' },
    { id: 'a4', company: 'Figma', role: 'Product Strategy', source: 'Alumni', stage: 'Final', appliedDate: '2026-01-29', followUpDate: '2026-03-07', notes: 'Decision expected next week.' }
  ],
  savedJobs: [
    { company: 'Anthropic', role: 'Program Strategy Lead' },
    { company: 'Atlassian', role: 'Head of Transformation' },
    { company: 'Datadog', role: 'Director, Product Operations' }
  ],
  searchQuerySummary: [
    { query: 'head of transformation', count: 22 },
    { query: 'chief strategy officer', count: 11 },
    { query: 'vp innovation', count: 9 },
    { query: 'ai operations leader', count: 7 }
  ]
};

const stages = ['Applied', 'Screen', 'Interview', 'Final', 'Offer'];

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return structuredClone(defaultState);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function toDate(value) {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysFrom(dateStr) {
  const d = toDate(dateStr);
  if (!d) return null;
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function scoreContact(c) {
  let score = 0;
  if (c.tie === 'moderate_weak') score += 35;
  if (c.tie === 'weak') score += 20;
  if (c.referralPotential === 'high') score += 30;
  if (c.referralPotential === 'medium') score += 18;
  if (c.lastTouchDays >= 120 && c.lastTouchDays <= 540) score += 20;
  if (c.mutuals >= 5) score += 10;
  return score;
}

function computeDerived() {
  const now = new Date();
  const totalApplications = state.applications.length;
  const interviewStage = state.applications.filter((a) => ['Interview', 'Final', 'Offer'].includes(a.stage)).length;
  const staleApplied = state.applications.filter((a) => {
    const days = daysFrom(a.appliedDate);
    return a.stage === 'Applied' && days !== null && days > 14;
  }).length;
  const dueFollowups = state.applications.filter((a) => {
    const d = toDate(a.followUpDate);
    return d && d <= now;
  }).length;
  const referralSourced = state.applications.filter((a) => a.source === 'Referral' || a.source === 'Alumni').length;

  const prioritizedContacts = [...state.contacts]
    .map((c) => ({ ...c, priority: scoreContact(c) }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 6);

  const stageCounts = Object.fromEntries(stages.map((s) => [s, 0]));
  for (const app of state.applications) {
    if (!stageCounts[app.stage]) stageCounts[app.stage] = 0;
    stageCounts[app.stage] += 1;
  }

  const targetCompanies = [...new Set([
    ...state.applications.map((a) => a.company),
    ...(state.savedJobs || []).map((j) => j.company)
  ].filter(Boolean))];

  const companyCoverage = targetCompanies.map((company) => {
    const contacts = state.contacts.filter((c) => c.company === company);
    const warmPaths = contacts.filter((c) => ['warm', 'moderate_weak'].includes(c.tie)).length;
    return {
      company,
      contactCount: contacts.length,
      warmPaths,
      signal: warmPaths >= 2 ? 'Strong' : warmPaths === 1 ? 'Moderate' : contacts.length ? 'Cold-only' : 'No path'
    };
  }).sort((a, b) => (b.warmPaths + b.contactCount) - (a.warmPaths + a.contactCount));

  const queryText = (state.searchQuerySummary || []).map((q) => q.query).join(' ').toLowerCase();
  const alignedTargets = state.applications.filter((a) => {
    const role = (a.role || '').toLowerCase();
    return role && queryText.includes(role.split(' ')[0]);
  }).length;
  const intentFit = totalApplications ? Math.round((alignedTargets / totalApplications) * 100) : 0;
  const coverageRate = targetCompanies.length
    ? Math.round((companyCoverage.filter((c) => c.contactCount > 0).length / targetCompanies.length) * 100)
    : 0;
  const pipelineRisk = Math.min(100, (dueFollowups * 18) + (staleApplied * 14));

  return {
    totalApplications,
    interviewRate: totalApplications ? Math.round((interviewStage / totalApplications) * 100) : 0,
    dueFollowups,
    staleApplied,
    referralRate: totalApplications ? Math.round((referralSourced / totalApplications) * 100) : 0,
    prioritizedContacts,
    stageCounts,
    targetCompanies: targetCompanies.length,
    companyCoverage,
    intentFit,
    coverageRate,
    pipelineRisk
  };
}

function renderNav() {
  const activateView = (viewName) => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach((view) => view.classList.remove('active'));
    const btn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    const panel = document.getElementById(`view-${viewName}`);
    if (btn && panel) {
      btn.classList.add('active');
      panel.classList.add('active');
      window.location.hash = viewName;
    }
  };

  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activateView(btn.dataset.view);
    });
  });

  const initialView = (window.location.hash || '').replace('#', '').trim();
  if (initialView) activateView(initialView);
}

function renderOverview(derived) {
  const kpiGrid = document.getElementById('kpiGrid');
  kpiGrid.innerHTML = `
    <article class="stat">
      <div class="label">Applications Tracked</div>
      <div class="value">${derived.totalApplications}</div>
    </article>
    <article class="stat">
      <div class="label">Interview-stage Rate</div>
      <div class="value">${derived.interviewRate}%</div>
    </article>
    <article class="stat">
      <div class="label">Referral/Alumni Source Rate</div>
      <div class="value">${derived.referralRate}%</div>
    </article>
    <article class="stat">
      <div class="label">Follow-ups Due Now</div>
      <div class="value ${derived.dueFollowups > 0 ? 'text-danger' : 'text-ok'}">${derived.dueFollowups}</div>
    </article>
  `;

  const healthScore = Math.max(0, Math.min(100, Math.round((derived.interviewRate * 0.45) + (derived.referralRate * 0.35) + (Math.max(0, 100 - (derived.dueFollowups * 14)) * 0.2))));
  document.documentElement.style.setProperty('--meter-pos', `${healthScore}%`);
  document.getElementById('healthText').textContent = `Execution score: ${healthScore}/100`;
}

function renderInsights(derived) {
  const weakTieCount = state.contacts.filter((c) => c.tie === 'moderate_weak').length;
  const dormantHighPotential = state.contacts.filter((c) => c.lastTouchDays > 180 && c.referralPotential === 'high').length;
  const highMutuals = state.contacts.filter((c) => c.mutuals >= 5).length;

  const insights = [
    {
      title: 'Moderately weak ties are underused',
      body: `${weakTieCount} contacts sit in the moderate-weak zone where job transmission tends to be strongest.`,
      chips: ['Action: send 5 reconnection notes', 'Goal: 2 intro requests this week']
    },
    {
      title: 'Dormant but high-value relationships',
      body: `${dormantHighPotential} high-potential contacts have gone 180+ days without touch.`,
      chips: ['Action: personalized catch-up', 'Avoid generic “checking in” openers']
    },
    {
      title: 'Warm intro pathways available',
      body: `${highMutuals} contacts have 5+ mutuals, increasing intro path options.`,
      chips: ['Action: ask for specific role referral', 'Include role link + one sentence fit']
    }
  ];

  const insightCards = document.getElementById('insightCards');
  insightCards.innerHTML = insights.map((insight) => `
    <article class="insight-card">
      <h4>${insight.title}</h4>
      <p>${insight.body}</p>
      <div class="chips">${insight.chips.map((c) => `<span class="chip">${c}</span>`).join('')}</div>
    </article>
  `).join('');

  const tableBody = document.getElementById('priorityTable');
  tableBody.innerHTML = derived.prioritizedContacts.map((c) => {
    const signal = `${c.tie.replace('_', ' ')} tie · ${c.referralPotential} referral potential`;
    const action = c.lastTouchDays > 365
      ? 'Reintroduce with context + role target'
      : 'Ask for directional advice or intro';
    return `
      <tr>
        <td><strong>${c.name}</strong><br><span class="muted">${c.title}</span></td>
        <td>${c.company}</td>
        <td>${signal}</td>
        <td>${c.lastTouchDays} days ago</td>
        <td>${action}</td>
        <td><button class="btn-link" data-action="followup-contact" data-contact="${c.name}" data-company="${c.company}">Create follow-up</button></td>
      </tr>
    `;
  }).join('');

  tableBody.querySelectorAll('[data-action="followup-contact"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const contact = e.currentTarget.dataset.contact;
      const company = e.currentTarget.dataset.company;
      const existing = state.applications.find((a) => a.company === company && a.role === `Networking follow-up: ${contact}`);
      if (!existing) {
        state.applications.unshift({
          id: `a_${Date.now()}`,
          company,
          role: `Networking follow-up: ${contact}`,
          source: 'Referral',
          stage: 'Applied',
          appliedDate: new Date().toISOString().split('T')[0],
          followUpDate: new Date().toISOString().split('T')[0],
          notes: `Created from Priority Contacts quick action for ${contact}.`
        });
      }
      refresh();
    });
  });

  const intentGrid = document.getElementById('intentGrid');
  intentGrid.innerHTML = `
    <article class="stat">
      <div class="label">Intent Fit Score</div>
      <div class="value">${derived.intentFit}%</div>
    </article>
    <article class="stat">
      <div class="label">Target Companies</div>
      <div class="value">${derived.targetCompanies}</div>
    </article>
    <article class="stat">
      <div class="label">Coverage With Any Path</div>
      <div class="value">${derived.coverageRate}%</div>
    </article>
  `;

  const coverageTable = document.getElementById('coverageTable');
  coverageTable.innerHTML = derived.companyCoverage.map((row) => `
    <tr>
      <td><strong>${row.company}</strong></td>
      <td>${row.contactCount}</td>
      <td>${row.warmPaths}</td>
      <td>${row.signal}</td>
    </tr>
  `).join('') || `<tr><td colspan="4" class="muted">No target-company data yet.</td></tr>`;
}

function renderPipeline(derived) {
  const stageGrid = document.getElementById('stageGrid');
  stageGrid.innerHTML = stages.map((stage) => `
    <article class="stage">
      <h4>${stage}</h4>
      <div class="count">${derived.stageCounts[stage] || 0}</div>
    </article>
  `).join('');

  const focusQueue = document.getElementById('focusQueue');
  const tasks = [];

  state.applications.forEach((app) => {
    const daysApplied = daysFrom(app.appliedDate);
    const followUpGap = daysFrom(app.followUpDate);

    if (followUpGap !== null && followUpGap >= 0) {
      tasks.push(`Follow up ${app.company} (${app.role}) today.`);
    }

    if (daysApplied !== null && daysApplied > 14 && app.stage === 'Applied') {
      tasks.push(`Stalled at Applied: ${app.company} (${app.role}) for ${daysApplied} days. Escalate via referral path.`);
    }
  });

  if (!tasks.length) tasks.push('No urgent actions. Use this week for proactive warm intros and targeted outreach.');
  focusQueue.innerHTML = tasks.map((t) => `<li>${t}</li>`).join('');

  const riskGrid = document.getElementById('pipelineRiskGrid');
  riskGrid.innerHTML = `
    <article class="stat">
      <div class="label">Pipeline Risk</div>
      <div class="value ${derived.pipelineRisk >= 45 ? 'text-danger' : derived.pipelineRisk >= 20 ? 'text-warn' : 'text-ok'}">${derived.pipelineRisk}</div>
    </article>
    <article class="stat">
      <div class="label">Stale Applied (&gt;14d)</div>
      <div class="value">${derived.staleApplied}</div>
    </article>
    <article class="stat">
      <div class="label">Follow-ups Overdue</div>
      <div class="value ${derived.dueFollowups > 0 ? 'text-danger' : 'text-ok'}">${derived.dueFollowups}</div>
    </article>
  `;
}

function renderApplicationsTable() {
  const tbody = document.getElementById('applicationsTable');
  tbody.innerHTML = state.applications.map((app) => {
    const isDue = (() => {
      const d = toDate(app.followUpDate);
      return d && d <= new Date();
    })();

    const ageDays = daysFrom(app.appliedDate);
    const statusLabel = isDue
      ? '<span class="status-badge status-risk">Follow-up due</span>'
      : (app.stage === 'Applied' && ageDays !== null && ageDays > 14)
        ? '<span class="status-badge status-watch">Stale applied</span>'
        : '<span class="status-badge status-ok">On track</span>';

    return `
      <tr>
        <td><strong>${app.company}</strong></td>
        <td>${app.role}</td>
        <td>${app.source}</td>
        <td>
          <select data-action="stage" data-id="${app.id}">
            ${stages.map((s) => `<option value="${s}" ${s === app.stage ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>${app.appliedDate || ''}</td>
        <td>
          <input data-action="followup" data-id="${app.id}" type="date" value="${app.followUpDate || ''}" />
          ${isDue ? '<div class="text-danger" style="font-size:0.72rem;font-weight:700;">Due</div>' : ''}
        </td>
        <td>${statusLabel}</td>
        <td><button class="btn btn-sm" data-action="delete" data-id="${app.id}">Remove</button></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-action="stage"]').forEach((select) => {
    select.addEventListener('change', (e) => {
      const app = state.applications.find((a) => a.id === e.target.dataset.id);
      if (!app) return;
      app.stage = e.target.value;
      refresh();
    });
  });

  tbody.querySelectorAll('[data-action="followup"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const app = state.applications.find((a) => a.id === e.target.dataset.id);
      if (!app) return;
      app.followUpDate = e.target.value;
      refresh();
    });
  });

  tbody.querySelectorAll('[data-action="delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      state.applications = state.applications.filter((a) => a.id !== id);
      refresh();
    });
  });
}

function bindForm() {
  const form = document.getElementById('applicationForm');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);

    const next = {
      id: `a_${Date.now()}`,
      company: String(formData.get('company') || '').trim(),
      role: String(formData.get('role') || '').trim(),
      source: String(formData.get('source') || ''),
      stage: String(formData.get('stage') || 'Applied'),
      appliedDate: String(formData.get('appliedDate') || ''),
      followUpDate: String(formData.get('followUpDate') || ''),
      notes: String(formData.get('notes') || '').trim()
    };

    state.applications.unshift(next);
    form.reset();
    refresh();
  });
}

function bindReset() {
  document.getElementById('resetBtn').addEventListener('click', () => {
    state = structuredClone(defaultState);
    refresh();
  });
}

function refresh() {
  const derived = computeDerived();
  renderOverview(derived);
  renderInsights(derived);
  renderPipeline(derived);
  renderApplicationsTable();
  saveState();
}

let state = loadState();
renderNav();
bindForm();
bindReset();
refresh();
