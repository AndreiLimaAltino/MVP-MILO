'use strict';

const spaces = {
  personal: {
    title: 'Minha vida, em dia.',
    totalLabel: 'Saldo das contas',
    total: 4850,
    income: 6200,
    outcome: 3450,
    description: 'Entenda seus gastos por categoria e acompanhe as movimentações do mês em um só lugar.',
    transactions: [
      {name: 'Supermercado', category: 'Alimentação', amount: -186.50, icon: '↗'},
      {name: 'Salário', category: 'Receita pessoal', amount: 5200, icon: '↓'},
      {name: 'Conta de energia', category: 'Moradia', amount: -142.80, icon: '↗'},
      {name: 'Assinatura', category: 'Serviços', amount: -39.90, icon: '↗'}
    ]
  },
  business: {
    title: 'Seu negócio, à vista.',
    totalLabel: 'Saldo do espaço profissional',
    total: 12840,
    income: 18600,
    outcome: 9760,
    description: 'Separe as finanças do trabalho, acompanhe entradas e saídas e entenda o resultado financeiro da sua atividade.',
    transactions: [
      {name: 'Projeto recebido', category: 'Prestação de serviços', amount: 3400, icon: '↓'},
      {name: 'Assinatura de software', category: 'Ferramentas de trabalho', amount: -89.90, icon: '↗'},
      {name: 'Pagamento de fornecedor', category: 'Despesas operacionais', amount: -780, icon: '↗'},
      {name: 'Impostos', category: 'Obrigações', amount: -510, icon: '↗'}
    ]
  }
};

const STORAGE_KEYS = {
  events: 'milo_events',
  leads: 'milo_leads',
  selectedPlan: 'milo_selected_plan',
  interestCount: 'milo_interest_count'
};

const INITIAL_INTEREST_COUNT = 127;
// Este valor inicial é apenas ilustrativo para o protótipo.
// Em produção, mostrar somente dados reais vindos do servidor.

const money = value => new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
}).format(value);

function readJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch (error) {
    console.warn(`[Milo] Não foi possível ler ${key} do localStorage.`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[Milo] Não foi possível salvar ${key} no localStorage.`, error);
    return false;
  }
}

function trackEvent(eventName, data = {}) {
  const event = {
    event: eventName,
    data,
    timestamp: new Date().toISOString()
  };

  console.log('[Milo Smoke Test]', event);

  const existingEvents = readJSON(STORAGE_KEYS.events, []);
  existingEvents.push(event);
  writeJSON(STORAGE_KEYS.events, existingEvents);

  // ANALYTICS REAL:
  // Aqui entraria uma integração com Google Analytics, PostHog,
  // Mixpanel, Amplitude ou outra ferramenta de analytics.
}

window.trackEvent = trackEvent;

// Métricas locais do smoke test. A taxa de conversão usa:
// waitlist_completed / waitlist_started * 100.
window.miloMetrics = function miloMetrics() {
  const events = readJSON(STORAGE_KEYS.events, []);
  const count = name => events.filter(item => item.event === name).length;
  const waitlistStarted = count('waitlist_started');
  const waitlistSubmissions = count('waitlist_completed');
  const conversionRate = waitlistStarted > 0
    ? `${((waitlistSubmissions / waitlistStarted) * 100).toFixed(1)}%`
    : '0.0%';

  const metrics = {
    totalEvents: events.length,
    heroClicks: count('hero_cta_clicked'),
    personalDemoViews: count('personal_demo_viewed'),
    businessDemoViews: count('business_demo_viewed'),
    personalInterest: count('pricing_personal_clicked'),
    proInterest: count('pricing_pro_clicked'),
    businessInterest: count('pricing_business_clicked'),
    waitlistStarted,
    waitlistSubmissions,
    finalCtaClicks: count('final_cta_clicked'),
    conversionRate
  };

  console.table(metrics);
  return metrics;
};

let currentSpace = 'personal';
const tabs = [...document.querySelectorAll('[data-space]')];
const filter = document.querySelector('#category-filter');

function renderTransactions() {
  const items = spaces[currentSpace].transactions.filter(item => {
    return filter.value === 'all' || (filter.value === 'in' ? item.amount > 0 : item.amount < 0);
  });

  const list = document.querySelector('#transactions');
  list.replaceChildren(...items.map(item => {
    const li = document.createElement('li');
    const icon = document.createElement('span');
    icon.className = 'transaction-icon';
    icon.textContent = item.icon;
    icon.setAttribute('aria-hidden', 'true');

    const detail = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.name;
    const category = document.createElement('small');
    category.textContent = item.category;
    detail.append(title, category);

    const amount = document.createElement('span');
    amount.className = `amount ${item.amount > 0 ? 'in' : 'out'}`;
    amount.textContent = `${item.amount > 0 ? '+ ' : '− '}${money(Math.abs(item.amount))}`;

    li.append(icon, detail, amount);
    return li;
  }));

  document.querySelector('#transaction-status').textContent = `${items.length} ${items.length === 1 ? 'movimentação ilustrativa' : 'movimentações ilustrativas'} · Valores do mês incluem outras movimentações.`;
}

function selectSpace(space, shouldTrack = false) {
  if (!spaces[space]) return;

  currentSpace = space;
  const data = spaces[space];

  tabs.forEach(tab => {
    const selected = tab.dataset.space === space;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
  });

  document.querySelector('#demo-panel').setAttribute('aria-labelledby', `tab-${space}`);

  for (const [id, value] of Object.entries({
    'space-title': data.title,
    'space-description': data.description,
    'total-label': data.totalLabel,
    'total-value': money(data.total),
    'income-value': money(data.income),
    'outcome-value': money(data.outcome)
  })) {
    document.getElementById(id).textContent = value;
  }

  filter.value = 'all';
  renderTransactions();

  if (shouldTrack) {
    trackEvent(space === 'personal' ? 'personal_demo_viewed' : 'business_demo_viewed');
  }
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectSpace(tab.dataset.space, true));

  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;

    event.preventDefault();
    tabs[next].focus();
    selectSpace(tabs[next].dataset.space, true);
  });
});

filter.addEventListener('change', () => {
  renderTransactions();
  trackEvent('demo_filter_changed', {space: currentSpace, filter: filter.value});
});

document.querySelectorAll('[data-demo]').forEach(link => {
  link.addEventListener('click', () => selectSpace(link.dataset.demo, true));
});

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#menu');

function closeMenu() {
  menu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
}

menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menu.classList.toggle('is-open', open);
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});

menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});

document.addEventListener('click', event => {
  if (!event.target.closest('.nav')) closeMenu();
});

const desktopQuery = window.matchMedia('(min-width: 801px)');
if (desktopQuery.addEventListener) {
  desktopQuery.addEventListener('change', event => {
    if (event.matches) closeMenu();
  });
}

// MVP FUMAÇA:
// Este contador é apenas uma simulação local.
// Em produção, o valor deveria vir de um backend ou banco de dados.
function getInterestCount() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.interestCount));
  return Number.isFinite(saved) && saved >= INITIAL_INTEREST_COUNT ? saved : INITIAL_INTEREST_COUNT;
}

function renderInterestCount() {
  document.querySelector('#interest-count').textContent = String(getInterestCount());
}

function incrementInterestCount() {
  const next = getInterestCount() + 1;
  localStorage.setItem(STORAGE_KEYS.interestCount, String(next));
  renderInterestCount();
}

const planSelect = document.querySelector('#lead-plan');
const selectedPlanHint = document.querySelector('#selected-plan-hint');
const selectedPlanText = document.querySelector('#selected-plan-text');

function setSelectedPlan(plan) {
  const validPlans = ['Personal', 'Pro', 'Business'];
  if (!validPlans.includes(plan)) return;

  localStorage.setItem(STORAGE_KEYS.selectedPlan, plan);
  planSelect.value = plan;
  selectedPlanText.textContent = `Milo ${plan}`;
  selectedPlanHint.hidden = false;
}

const savedPlan = localStorage.getItem(STORAGE_KEYS.selectedPlan);
if (savedPlan) setSelectedPlan(savedPlan);

document.querySelectorAll('[data-plan]').forEach(button => {
  button.addEventListener('click', () => {
    const plan = button.dataset.plan;
    setSelectedPlan(plan);

    // SMOKE TEST:
    // Este clique representa intenção de contratação.
    // Não existe checkout real.
    // Em uma implementação real, este evento poderia ser enviado
    // para Google Analytics, PostHog, Mixpanel, Amplitude ou outra
    // ferramenta de analytics.
    const eventByPlan = {
      Personal: 'pricing_personal_clicked',
      Pro: 'pricing_pro_clicked',
      Business: 'pricing_business_clicked'
    };
    trackEvent(eventByPlan[plan], {plan});
  });
});

const heroCta = document.querySelector('#hero-cta');
heroCta.addEventListener('click', () => trackEvent('hero_cta_clicked'));

document.querySelector('#final-cta').addEventListener('click', () => trackEvent('final_cta_clicked'));

document.querySelectorAll('[data-nav-label]').forEach(link => {
  link.addEventListener('click', () => trackEvent('navigation_clicked', {
    label: link.dataset.navLabel,
    destination: link.getAttribute('href')
  }));
});

document.querySelectorAll('.faq details').forEach((details, index) => {
  details.addEventListener('toggle', () => {
    if (details.open) {
      trackEvent('faq_opened', {index: index + 1, question: details.querySelector('summary').childNodes[0].textContent.trim()});
    }
  });
});

const waitlistForm = document.querySelector('#waitlist-form');
const formStatus = document.querySelector('#form-status');
let waitlistStartedForAttempt = false;

function markWaitlistStarted() {
  if (waitlistStartedForAttempt) return;
  waitlistStartedForAttempt = true;
  trackEvent('waitlist_started');
}

waitlistForm.addEventListener('focusin', markWaitlistStarted);
waitlistForm.addEventListener('input', markWaitlistStarted);

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

waitlistForm.addEventListener('submit', event => {
  event.preventDefault();

  const formData = new FormData(waitlistForm);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const profile = String(formData.get('profile') || '');
  const difficulty = String(formData.get('difficulty') || '').trim();
  const plan = String(formData.get('plan') || 'Ainda não sei');
  const interviewInterest = formData.get('interviewInterest') === 'on';

  if (!name) {
    formStatus.className = 'form-status is-error';
    formStatus.textContent = 'Digite seu nome para entrar na lista.';
    document.querySelector('#lead-name').focus();
    return;
  }

  if (!isValidEmail(email)) {
    formStatus.className = 'form-status is-error';
    formStatus.textContent = 'Digite um e-mail válido para continuar.';
    document.querySelector('#lead-email').focus();
    return;
  }

  const lead = {
    name,
    email,
    profile,
    difficulty,
    plan,
    interviewInterest,
    createdAt: new Date().toISOString()
  };

  const leads = readJSON(STORAGE_KEYS.leads, []);
  const isNewLead = !leads.some(existingLead => existingLead.email === email);
  leads.push(lead);
  writeJSON(STORAGE_KEYS.leads, leads);

  console.log('[Milo Lead]', lead);
  trackEvent('waitlist_completed', {
    profile,
    plan,
    interviewInterest,
    isNewLead
  });

  if (isNewLead) incrementInterestCount();

  // INTEGRAÇÃO REAL:
  // Aqui entraria a integração com backend, banco de dados,
  // CRM ou ferramenta de e-mail marketing.
  // Exemplos: Brevo, Mailchimp, HubSpot, ConvertKit,
  // Supabase, Firebase ou API própria.

  const planMessage = plan !== 'Ainda não sei' ? ` Interesse registrado: Milo ${plan}.` : '';
  formStatus.className = 'form-status is-success';
  formStatus.textContent = `Você está na lista ✳ Obrigado pelo interesse na Milo. Se avançarmos para os primeiros testes, queremos você por perto.${planMessage}`;

  waitlistForm.reset();
  waitlistStartedForAttempt = false;

  if (plan !== 'Ainda não sei') {
    setSelectedPlan(plan);
  } else {
    selectedPlanHint.hidden = true;
    localStorage.removeItem(STORAGE_KEYS.selectedPlan);
  }
});

renderTransactions();
renderInterestCount();

// Controle acessível do vídeo promocional da Milo.
const promoVideo = document.querySelector('#milo-promo-video');
const videoToggle = document.querySelector('#video-toggle');

if (promoVideo && videoToggle) {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function syncVideoButton() {
    const isPlaying = !promoVideo.paused;
    videoToggle.setAttribute('aria-pressed', String(isPlaying));
    videoToggle.setAttribute('aria-label', isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo');
    videoToggle.querySelector('span').textContent = isPlaying ? '❚❚' : '▶';
  }

  if (reducedMotion.matches) {
    promoVideo.pause();
  }

  videoToggle.addEventListener('click', async () => {
    if (promoVideo.paused) {
      try {
        await promoVideo.play();
        trackEvent('promo_video_played');
      } catch (error) {
        console.warn('[Milo] Não foi possível reproduzir o vídeo automaticamente.', error);
      }
    } else {
      promoVideo.pause();
      trackEvent('promo_video_paused');
    }
    syncVideoButton();
  });

  promoVideo.addEventListener('play', syncVideoButton);
  promoVideo.addEventListener('pause', syncVideoButton);
  syncVideoButton();
}
