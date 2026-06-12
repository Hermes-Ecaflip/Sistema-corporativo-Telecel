// =============================================================================
// TELECEL SYSTEM — Shell compartilhado (sidebar, topbar) + helpers de gráfico
// Carregado por todas as páginas do app. Dados de demonstração inclusos.
// =============================================================================

/* ---------------------------------------------------------------------------
 * LOGO (SVG inline reutilizável)
 * ------------------------------------------------------------------------- */
const TC_LOGO = `
<svg class="sidebar-logo" viewBox="0 0 320 230" role="img" aria-label="Grupo Telecel">
  <g opacity="0.95">
    <path d="M150 25 A78 78 0 1 1 72 103" fill="none" stroke="#d4d4d4" stroke-width="20" stroke-linecap="round"/>
    <path d="M150 70 A45 45 0 1 0 195 115" fill="none" stroke="#d4d4d4" stroke-width="20" stroke-linecap="round"/>
  </g>
  <text x="8" y="100" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="38" font-style="italic" fill="#ff5a1f" letter-spacing="1">GRUPO</text>
  <text x="2" y="170" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="66" font-style="italic" fill="#ff5a1f" letter-spacing="-1">TELECEL</text>
</svg>`;

/* ---------------------------------------------------------------------------
 * Ícones (Lucide-style, traçado)
 * ------------------------------------------------------------------------- */
const ICONS = {
  stores: '<path d="M3 21h18M3 7v14M21 7v14M6 21V11h4v10M14 21v-4h4v4M3 7l9-4 9 4M3 7h18"/>',
  stock: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
  dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
  clients: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  sales: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>',
  commissions: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  financial: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>',
  reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  approvals: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  audit: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 15l2 2 4-4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  support: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01"/>',
  trend: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
  cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
};

/* ---------------------------------------------------------------------------
 * NAV — itens da sidebar (mesma ordem do mockup)
 * ------------------------------------------------------------------------- */
const NAV = [
  { id: 'dashboard',  label: 'Dashboard',    icon: 'dashboard',   href: 'dashboard.html' },
  { id: 'clients',    label: 'Clientes',     icon: 'clients',     href: 'clientes.html' },
  { id: 'sales',      label: 'Vendas',       icon: 'sales',       href: 'vendas.html' },
  { id: 'stock',      label: 'Estoque',      icon: 'stock',       href: 'estoque.html' },
  { id: 'commissions',label: 'Comissões',    icon: 'commissions', href: 'comissoes.html' },
  { id: 'financial',  label: 'Financeiro',   icon: 'financial',   href: 'financeiro.html' },
  { id: 'reports',    label: 'Relatórios',   icon: 'reports',     href: 'relatorios.html' },
  { id: 'users',      label: 'Usuários',     icon: 'users',       href: 'usuarios.html' },
  { id: 'stores',     label: 'Lojas',        icon: 'stores',      href: 'lojas.html' },
  { id: 'approvals',  label: 'Aprovações',   icon: 'approvals',   href: 'vendas.html', badge: 12 },
  { id: 'audit',      label: 'Auditoria',    icon: 'audit',       href: 'auditoria.html' },
  { id: 'settings',   label: 'Configurações',icon: 'settings',    href: 'configuracoes.html' },
  { id: 'support',    label: 'Suporte',      icon: 'support',     href: 'suporte.html' },
];

function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
}

/* ---------------------------------------------------------------------------
 * Monta o shell (sidebar + topbar) e injeta antes do conteúdo
 * Uso: TC.mountShell('dashboard')  — passa o id da página ativa
 * ------------------------------------------------------------------------- */
const TC = {
  mountShell(activeId) {
    // Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-brand">${TC_LOGO}</div>
      <nav class="sidebar-nav">
        ${NAV.map((n) => `
          <a class="nav-item ${n.id === activeId ? 'active' : ''}" href="${n.href}">
            ${icon(n.icon)}
            <span>${n.label}</span>
            ${n.badge ? `<span class="nav-badge">${n.badge}</span>` : ''}
          </a>`).join('')}
      </nav>`;

    // Main + topbar
    const main = document.createElement('div');
    main.className = 'main';

    const topbar = document.createElement('header');
    topbar.className = 'topbar';
    topbar.innerHTML = `
      <button class="icon-btn menu-toggle" id="menuToggle" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="topbar-search">
        ${icon('search')}
        <input type="text" placeholder="Buscar clientes, vendas, usuários..." />
      </div>
      <div class="topbar-actions">
        <button class="icon-btn" aria-label="Notificações">${icon('bell')}<span class="dot"></span></button>
        <button class="icon-btn" aria-label="Ajuda">${icon('help')}</button>
        <div class="topbar-user">
          <div class="avatar">AD</div>
          <div>
            <div class="u-name">Admin</div>
            <div class="u-role">Administrador</div>
          </div>
        </div>
      </div>`;

    // move o conteúdo existente para dentro de .content
    const contentSource = document.getElementById('page');
    const content = document.createElement('div');
    content.className = 'content';
    if (contentSource) content.innerHTML = contentSource.innerHTML;

    main.appendChild(topbar);
    main.appendChild(content);

    const layout = document.createElement('div');
    layout.className = 'layout';
    layout.appendChild(sidebar);
    layout.appendChild(main);

    document.body.innerHTML = '';
    document.body.appendChild(layout);

    // toggle mobile
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  },

  /* -------------------------------------------------------------------------
   * Gráfico de LINHA (SVG puro)
   * ----------------------------------------------------------------------- */
  lineChart(el, series, opts = {}) {
    const w = opts.width || el.clientWidth || 600;
    const h = opts.height || 220;
    const pad = { t: 16, r: 16, b: 26, l: 38 };
    const allVals = series.flatMap((s) => s.data);
    const max = Math.max(...allVals) * 1.1;
    const min = 0;
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const n = series[0].data.length;
    const xStep = iw / (n - 1);
    const yScale = (v) => pad.t + ih - ((v - min) / (max - min)) * ih;
    const labels = opts.labels || [];
    const isCurrency = opts.currency !== false;
    const fmt = (v) => (isCurrency ? 'R$ ' + v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR'));

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ih / 4) * i;
      const val = Math.round(max - (max / 4) * i);
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="#eef0f4" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8b93a4">${val}</text>`;
    }

    const paths = series.map((s) => {
      const pts = s.data.map((v, i) => `${pad.l + i * xStep},${yScale(v)}`);
      const line = `M ${pts.join(' L ')}`;
      const area = `${line} L ${pad.l + (n - 1) * xStep},${pad.t + ih} L ${pad.l},${pad.t + ih} Z`;
      const color = s.color || '#ff5a1f';
      const gid = 'g' + Math.random().toString(36).slice(2, 7);
      return `
        <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.18"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
        </linearGradient></defs>
        ${s.fill !== false ? `<path d="${area}" fill="url(#${gid})"/>` : ''}
        <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        ${s.data.map((v, i) => `<circle class="pt" data-i="${i}" cx="${pad.l + i * xStep}" cy="${yScale(v)}" r="3" fill="#fff" stroke="${color}" stroke-width="2"/>`).join('')}`;
    }).join('');

    const labelEls = labels.map((l, i) =>
      `<text x="${pad.l + i * xStep}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#8b93a4">${l}</text>`
    ).join('');

    // Linha-guia vertical + zonas de hover invisíveis (uma por ponto)
    const guide = `<line id="guide" x1="0" y1="${pad.t}" x2="0" y2="${pad.t + ih}" stroke="#ff5a1f" stroke-width="1" stroke-dasharray="4 3" style="opacity:0"/>`;
    const hoverZones = Array.from({ length: n }, (_, i) =>
      `<rect class="hz" data-i="${i}" x="${pad.l + i * xStep - xStep / 2}" y="${pad.t}" width="${xStep}" height="${ih}" fill="transparent" style="cursor:crosshair"/>`
    ).join('');

    el.style.position = 'relative';
    el.innerHTML =
      `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" preserveAspectRatio="xMidYMid meet">${grid}${paths}${labelEls}${guide}${hoverZones}</svg>` +
      `<div class="chart-tooltip" style="opacity:0"></div>`;

    // Interatividade
    const svg = el.querySelector('svg');
    const tip = el.querySelector('.chart-tooltip');
    const guideLine = el.querySelector('#guide');
    el.querySelectorAll('.hz').forEach((zone) => {
      zone.addEventListener('mouseenter', () => {
        const i = +zone.dataset.i;
        const x = pad.l + i * xStep;
        guideLine.setAttribute('x1', x);
        guideLine.setAttribute('x2', x);
        guideLine.style.opacity = '1';
        el.querySelectorAll('.pt').forEach((p) => {
          p.setAttribute('r', +p.dataset.i === i ? '5' : '3');
        });
        const rows = series.map((s) =>
          `<div class="tt-row"><span class="tt-dot" style="background:${s.color || '#ff5a1f'}"></span>${s.name || 'Série'}: <strong>${fmt(s.data[i])}</strong></div>`
        ).join('');
        tip.innerHTML = `<div class="tt-title">${labels[i] || 'Ponto ' + (i + 1)}</div>${rows}`;
        // posicionar tooltip (em % relativo ao container)
        const xpct = (x / w) * 100;
        tip.style.left = xpct + '%';
        tip.style.opacity = '1';
        tip.style.transform = 'translateX(' + (xpct > 70 ? '-100%' : '-50%') + ')';
      });
      zone.addEventListener('mouseleave', () => {
        guideLine.style.opacity = '0';
        tip.style.opacity = '0';
        el.querySelectorAll('.pt').forEach((p) => p.setAttribute('r', '3'));
      });
    });
  },

  /* -------------------------------------------------------------------------
   * Gráfico de BARRAS (SVG)
   * ----------------------------------------------------------------------- */
  barChart(el, data, opts = {}) {
    const w = opts.width || el.clientWidth || 600;
    const h = opts.height || 220;
    const pad = { t: 16, r: 16, b: 26, l: 38 };
    const max = Math.max(...data.map((d) => d.value)) * 1.1;
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;
    const bw = (iw / data.length) * 0.55;
    const gap = (iw / data.length);

    let grid = '';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (ih / 4) * i;
      grid += `<line x1="${pad.l}" y1="${y}" x2="${w - pad.r}" y2="${y}" stroke="#eef0f4" stroke-width="1"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8b93a4">${Math.round(max - (max/4)*i)}</text>`;
    }
    const bars = data.map((d, i) => {
      const bh = (d.value / max) * ih;
      const x = pad.l + gap * i + (gap - bw) / 2;
      const y = pad.t + ih - bh;
      return `<rect class="bar" data-i="${i}" x="${x}" y="${y}" width="${bw}" height="${bh}" rx="4" fill="${d.color || '#ff5a1f'}" style="cursor:pointer;transition:opacity .15s"/>
              <text x="${x + bw/2}" y="${h - 6}" text-anchor="middle" font-size="10" fill="#8b93a4">${d.label}</text>`;
    }).join('');
    el.style.position = 'relative';
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">${grid}${bars}</svg><div class="chart-tooltip" style="opacity:0"></div>`;

    const tip = el.querySelector('.chart-tooltip');
    const isCurrency = opts.currency === true;
    const fmt = (v) => (isCurrency ? 'R$ ' + v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR'));
    el.querySelectorAll('.bar').forEach((bar) => {
      bar.addEventListener('mouseenter', () => {
        const d = data[+bar.dataset.i];
        el.querySelectorAll('.bar').forEach((b) => (b.style.opacity = '0.45'));
        bar.style.opacity = '1';
        tip.innerHTML = `<div class="tt-row"><strong>${d.label}</strong>: ${fmt(d.value)}</div>`;
        const xpct = ((pad.l + gap * (+bar.dataset.i) + gap / 2) / w) * 100;
        tip.style.left = xpct + '%';
        tip.style.transform = 'translateX(-50%)';
        tip.style.opacity = '1';
      });
      bar.addEventListener('mouseleave', () => {
        el.querySelectorAll('.bar').forEach((b) => (b.style.opacity = '1'));
        tip.style.opacity = '0';
      });
    });
  },

  /* -------------------------------------------------------------------------
   * DONUT (SVG)
   * ----------------------------------------------------------------------- */
  donut(el, segments, opts = {}) {
    const size = opts.size || 180;
    const r = size / 2;
    const stroke = opts.stroke || 26;
    const radius = r - stroke / 2;
    const circ = 2 * Math.PI * radius;
    const total = segments.reduce((s, x) => s + x.value, 0);
    const isCurrency = opts.currency === true;
    const fmt = (v) => (isCurrency ? 'R$ ' + v.toLocaleString('pt-BR') : v.toLocaleString('pt-BR'));
    let offset = 0;
    const arcs = segments.map((seg, idx) => {
      const frac = seg.value / total;
      const len = frac * circ;
      const dash = `${len} ${circ - len}`;
      const arc = `<circle class="seg" data-i="${idx}" cx="${r}" cy="${r}" r="${radius}" fill="none" stroke="${seg.color}" stroke-width="${stroke}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${r} ${r})" stroke-linecap="butt" style="cursor:pointer;transition:stroke-width .15s"/>`;
      offset += len;
      return arc;
    }).join('');
    el.style.position = 'relative';
    el.innerHTML = `
      <div class="donut-wrap" style="position:relative">
        <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
          <circle cx="${r}" cy="${r}" r="${radius}" fill="none" stroke="#f0f2f5" stroke-width="${stroke}"/>
          ${arcs}
        </svg>
        ${opts.center ? `<div class="donut-center"><div class="big">${opts.center.value}</div><div class="lbl">${opts.center.label}</div></div>` : ''}
        <div class="chart-tooltip donut-tip" style="opacity:0"></div>
      </div>`;

    const tip = el.querySelector('.donut-tip');
    const centerEl = el.querySelector('.donut-center');
    el.querySelectorAll('.seg').forEach((arc) => {
      arc.addEventListener('mouseenter', () => {
        const i = +arc.dataset.i;
        const seg = segments[i];
        const pct = ((seg.value / total) * 100).toFixed(1);
        arc.setAttribute('stroke-width', stroke + 6);
        if (centerEl) centerEl.style.opacity = '0';
        tip.innerHTML = `<div class="tt-row"><span class="tt-dot" style="background:${seg.color}"></span>${seg.label || seg.name}: <strong>${fmt(seg.value)}</strong> (${pct}%)</div>`;
        tip.style.opacity = '1';
      });
      arc.addEventListener('mouseleave', () => {
        arc.setAttribute('stroke-width', stroke);
        if (centerEl) centerEl.style.opacity = '1';
        tip.style.opacity = '0';
      });
    });
  },

  /* gauge semicircular (meta) */
  gauge(el, pct, opts = {}) {
    const size = opts.size || 180;
    const stroke = 18;
    const r = (size - stroke) / 2;
    const cx = size / 2, cy = size / 2;
    const circ = Math.PI * r; // semicircle
    const filled = (pct / 100) * circ;
    el.innerHTML = `
      <div class="donut-wrap">
        <svg viewBox="0 0 ${size} ${size/1.7}" width="${size}" height="${size/1.7}">
          <path d="M ${stroke/2} ${cy} A ${r} ${r} 0 0 1 ${size-stroke/2} ${cy}" fill="none" stroke="#f0f2f5" stroke-width="${stroke}" stroke-linecap="round"/>
          <path d="M ${stroke/2} ${cy} A ${r} ${r} 0 0 1 ${size-stroke/2} ${cy}" fill="none" stroke="#ff5a1f" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${filled} ${circ}"/>
        </svg>
        <div class="donut-center" style="top:auto;bottom:0"><div class="big">${pct}%</div></div>
      </div>`;
  },

  fmtBRL(v) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  },
};

window.TC = TC;
window.tcIcon = icon;

// ===================== Filtros de marca/loja =====================
// Vincula o seletor de marca ao de loja: ao escolher uma marca,
// só as lojas daquela marca ficam visíveis. No Módulo de integração,
// estas seleções viram parâmetros das chamadas à API
// (ex.: /dashboard/overview?brand=TIM&storeId=...).
(function initBrandStoreFilters() {
  function wire() {
    const brandSel = document.getElementById('brandFilter');
    const storeSel = document.getElementById('storeFilter');
    if (!brandSel || !storeSel) return;

    // Prefixo do código de cada marca, usado para casar com as <option>
    const brandPrefix = { TIM: 'TIM-', MOTOROLA: 'MOTO-', SAMSUNG: 'SAM-' };

    brandSel.addEventListener('change', () => {
      const brand = brandSel.value;
      // Mostrar/ocultar optgroups conforme a marca
      [...storeSel.querySelectorAll('optgroup')].forEach((group) => {
        const show = !brand || group.label.toUpperCase() === brand;
        group.style.display = show ? '' : 'none';
        [...group.children].forEach((opt) => (opt.hidden = !show));
      });
      // Resetar a loja se ela não pertence mais à marca escolhida
      if (brand && storeSel.value && !storeSel.value.startsWith(brandPrefix[brand])) {
        storeSel.value = '';
      }
      applyFilters();
    });

    storeSel.addEventListener('change', applyFilters);

    function applyFilters() {
      const filters = { brand: brandSel.value || null, store: storeSel.value || null };
      // TODO (integração): recarregar KPIs/gráficos com estes filtros via API.
      console.log('Filtros aplicados:', filters);
      document.dispatchEvent(new CustomEvent('tc:filters', { detail: filters }));
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();

/* ─────────────────────────────────────────────────────────────
   Filtros de Marca / Loja (Dashboard, Vendas, etc.)
   Marca selecionada → filtra as lojas exibidas no segundo select.
   Dispara o evento 'tc:filters' com { brand, store } para a página
   reagir (integração com a API entra depois).
   ───────────────────────────────────────────────────────────── */
(function initBrandStoreFilters() {
  function setup() {
    var brandSel = document.getElementById('brandFilter');
    var storeSel = document.getElementById('storeFilter');
    if (!brandSel || !storeSel) return;

    // Guarda os optgroups originais para poder restaurar
    var allGroups = Array.prototype.slice.call(storeSel.querySelectorAll('optgroup'));

    function applyBrandToStores() {
      var brand = brandSel.value; // '', 'TIM', 'MOTOROLA', 'SAMSUNG'
      allGroups.forEach(function (g) {
        // O label do optgroup bate com a marca (TIM, Motorola, Samsung)
        var match = !brand || g.label.toUpperCase() === brand;
        g.style.display = match ? '' : 'none';
        Array.prototype.slice.call(g.children).forEach(function (opt) {
          opt.disabled = !match;
        });
      });
      // Se a loja selecionada não pertence à marca, volta para "Todas"
      var current = storeSel.selectedOptions[0];
      if (current && current.parentElement && current.parentElement.tagName === 'OPTGROUP') {
        if (brand && current.parentElement.label.toUpperCase() !== brand) {
          storeSel.value = '';
        }
      }
    }

    function emit() {
      document.dispatchEvent(new CustomEvent('tc:filters', {
        detail: { brand: brandSel.value, store: storeSel.value }
      }));
    }

    brandSel.addEventListener('change', function () { applyBrandToStores(); emit(); });
    storeSel.addEventListener('change', emit);
    applyBrandToStores();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();

/* Toast simples reutilizável */
window.tcToast = function (msg, type) {
  var t = document.createElement('div');
  t.className = 'tc-toast ' + (type || '');
  t.textContent = msg;
  t.style.cssText = 'position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#1f2430;color:#fff;padding:13px 22px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:0 12px 30px rgba(0,0,0,.25);z-index:9999;opacity:0;transition:opacity .25s';
  document.body.appendChild(t);
  requestAnimationFrame(function(){ t.style.opacity = '1'; });
  setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 300); }, 2800);
};
