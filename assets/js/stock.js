// =============================================================================
// TELECEL SYSTEM — assets/js/stock.js
// Lógica interativa do Estoque: abas, itens, transferências (regra de marca)
// e registro de aparelhos danificados (com upload de imagem).
// =============================================================================

(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var toast = window.tcToast || function (m) { alert(m); };

  // ─── Lojas (código → {nome, marca}) ───
  var STORES = {
    'TIM-PLAN-DF': { name: 'TIM Planaltina — DF', brand: 'TIM' },
    'TIM-JK-DF':   { name: 'TIM JK Shopping — DF', brand: 'TIM' },
    'TIM-CRB-MS':  { name: 'TIM Corumbá — MS', brand: 'TIM' },
    'MOTO-SP-001': { name: 'Motorola Paulista — SP', brand: 'MOTOROLA' },
    'MOTO-RJ-001': { name: 'Motorola Barra — RJ', brand: 'MOTOROLA' },
    'SAM-MG-001':  { name: 'Samsung BH Shopping — MG', brand: 'SAMSUNG' },
    'SAM-DF-001':  { name: 'Samsung Brasília — DF', brand: 'SAMSUNG' },
  };
  var brandBadge = { TIM: 'badge-blue', MOTOROLA: 'badge-amber', SAMSUNG: 'badge-gray' };
  var statusBadge = { AVAILABLE: 'badge-green', IN_TRANSIT: 'badge-amber', DAMAGED: 'badge-red', SOLD: 'badge-gray', RESERVED: 'badge-blue' };
  var statusLabel = { AVAILABLE: 'Disponível', IN_TRANSIT: 'Em trânsito', DAMAGED: 'Danificado', SOLD: 'Vendido', RESERVED: 'Reservado' };

  // ─── Dados demo (espelham o seed) ───
  var items = [
    { id: 'i1', product: 'Motorola Edge 50 Ultra', imei: '356938035643809', barcode: '7891234567890', brand: 'MOTOROLA', store: 'MOTO-SP-001', status: 'AVAILABLE' },
    { id: 'i2', product: 'Motorola Edge 50 Ultra', imei: '356938035643810', barcode: '7891234567890', brand: 'MOTOROLA', store: 'MOTO-SP-001', status: 'AVAILABLE' },
    { id: 'i3', product: 'Motorola Moto G84 5G', imei: '356938035643811', barcode: '7891234567891', brand: 'MOTOROLA', store: 'MOTO-RJ-001', status: 'IN_TRANSIT' },
    { id: 'i4', product: 'Samsung Galaxy S24 Ultra', imei: '356938035643812', barcode: '7891234567892', brand: 'SAMSUNG', store: 'SAM-MG-001', status: 'AVAILABLE' },
    { id: 'i5', product: 'Samsung Galaxy A55 5G', imei: '356938035643813', barcode: '7891234567893', brand: 'SAMSUNG', store: 'SAM-DF-001', status: 'AVAILABLE' },
    { id: 'i6', product: 'Samsung Galaxy S24 Ultra', imei: '356938035643814', barcode: '7891234567892', brand: 'SAMSUNG', store: 'SAM-MG-001', status: 'DAMAGED' },
  ];
  var transfers = [
    { code: 'TRF-2026-0001', from: 'MOTO-SP-001', to: 'MOTO-RJ-001', brand: 'MOTOROLA', count: 1, status: 'PENDING' },
  ];
  var damages = [
    { code: 'DAN-2026-0001', product: 'Samsung Galaxy S24 Ultra', brand: 'SAMSUNG', store: 'SAM-MG-001', severity: 'MODERATE', status: 'REPORTED' },
  ];
  var sevLabel = { MINOR: 'Leve', MODERATE: 'Moderado', SEVERE: 'Grave', TOTAL: 'Perda total' };
  var sevBadge = { MINOR: 'badge-blue', MODERATE: 'badge-amber', SEVERE: 'badge-red', TOTAL: 'badge-red' };

  var brandFilter = '';

  // ─── KPIs ───
  function renderKpis() {
    var f = items.filter(function (i) { return !brandFilter || i.brand === brandFilter; });
    $('#kpiTotal').textContent = f.length;
    $('#kpiAvail').textContent = f.filter(function (i) { return i.status === 'AVAILABLE'; }).length;
    $('#kpiTransit').textContent = f.filter(function (i) { return i.status === 'IN_TRANSIT'; }).length;
    $('#kpiDamaged').textContent = f.filter(function (i) { return i.status === 'DAMAGED'; }).length;
  }

  // ─── Render: itens ───
  function renderItems() {
    var search = ($('#searchItems').value || '').toLowerCase();
    var rows = items.filter(function (i) {
      if (brandFilter && i.brand !== brandFilter) return false;
      if (search && i.imei.toLowerCase().indexOf(search) < 0 && i.barcode.toLowerCase().indexOf(search) < 0) return false;
      return true;
    });
    $('#itemsBody').innerHTML = rows.map(function (i) {
      return '<tr>' +
        '<td><strong>' + i.product + '</strong></td>' +
        '<td><code>' + i.imei + '</code></td>' +
        '<td>' + i.barcode + '</td>' +
        '<td><span class="badge ' + brandBadge[i.brand] + '">' + i.brand + '</span></td>' +
        '<td>' + (STORES[i.store] ? STORES[i.store].name : i.store) + '</td>' +
        '<td><span class="badge ' + statusBadge[i.status] + '">' + statusLabel[i.status] + '</span></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="6" class="empty">Nenhum item encontrado.</td></tr>';
  }

  // ─── Render: transferências ───
  function renderTransfers() {
    $('#transfersBody').innerHTML = transfers.filter(function (t) {
      return !brandFilter || t.brand === brandFilter;
    }).map(function (t) {
      var done = t.status === 'COMPLETED';
      return '<tr>' +
        '<td><strong>' + t.code + '</strong></td>' +
        '<td>' + STORES[t.from].name + '</td>' +
        '<td>' + STORES[t.to].name + '</td>' +
        '<td><span class="badge ' + brandBadge[t.brand] + '">' + t.brand + '</span></td>' +
        '<td>' + t.count + '</td>' +
        '<td><span class="badge ' + (done ? 'badge-green' : 'badge-amber') + '">' + (done ? 'Concluída' : 'Pendente') + '</span></td>' +
        '<td><button class="btn btn-xs" data-pdf-transfer="' + t.code + '">' + tcIcon('reports') + ' PDF</button></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Nenhuma transferência.</td></tr>';
  }

  // ─── Render: danos ───
  function renderDamages() {
    $('#damageBody').innerHTML = damages.filter(function (d) {
      return !brandFilter || d.brand === brandFilter;
    }).map(function (d) {
      return '<tr>' +
        '<td><strong>' + d.code + '</strong></td>' +
        '<td>' + d.product + '</td>' +
        '<td><span class="badge ' + brandBadge[d.brand] + '">' + d.brand + '</span></td>' +
        '<td>' + STORES[d.store].name + '</td>' +
        '<td><span class="badge ' + sevBadge[d.severity] + '">' + sevLabel[d.severity] + '</span></td>' +
        '<td><span class="badge badge-amber">Registrado</span></td>' +
        '<td><button class="btn btn-xs" data-pdf-damage="' + d.code + '">' + tcIcon('reports') + ' PDF</button></td>' +
      '</tr>';
    }).join('') || '<tr><td colspan="7" class="empty">Nenhum registro.</td></tr>';
  }

  function renderAll() { renderKpis(); renderItems(); renderTransfers(); renderDamages(); }

  // ─── Abas ───
  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      $$('.tab').forEach(function (t) { t.classList.remove('active'); });
      $$('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
      tab.classList.add('active');
      $('[data-panel="' + tab.dataset.tab + '"]').classList.add('active');
    });
  });

  // ─── Filtro de marca ───
  $('#brandFilter').addEventListener('change', function (e) { brandFilter = e.target.value; renderAll(); });
  $('#searchItems').addEventListener('input', renderItems);

  // ─── Botões de cabeçalho ───
  $('#btnAddItem').innerHTML = tcIcon('plus') + ' Adicionar Item';
  $('#btnAddItem').addEventListener('click', openAddItem);
  $('#btnNewTransfer').addEventListener('click', openNewTransfer);
  $('#btnNewDamage').addEventListener('click', openNewDamage);

  // ─── PDFs (delegação) ───
  document.addEventListener('click', function (e) {
    var bt = e.target.closest('[data-pdf-transfer]');
    var bd = e.target.closest('[data-pdf-damage]');
    if (bt) toast('Gerando PDF do remanejamento ' + bt.dataset.pdfTransfer + '…', 'success');
    if (bd) toast('Gerando PDF do registro de dano ' + bd.dataset.pdfDamage + '…', 'success');
  });

  // ═══════════════════════ MODAIS ═══════════════════════
  var overlay = $('#modalOverlay');
  function openModal(html) {
    overlay.innerHTML = '<div class="modal">' + html + '</div>';
    overlay.classList.add('show');
  }
  function closeModal() { overlay.classList.remove('show'); overlay.innerHTML = ''; }
  overlay.addEventListener('click', function (e) { if (e.target === overlay) closeModal(); });

  function storeOptions(filterBrand) {
    var groups = { TIM: [], MOTOROLA: [], SAMSUNG: [] };
    Object.keys(STORES).forEach(function (code) {
      var s = STORES[code];
      if (filterBrand && s.brand !== filterBrand) return;
      groups[s.brand].push('<option value="' + code + '">' + s.name + '</option>');
    });
    return Object.keys(groups).map(function (b) {
      return groups[b].length ? '<optgroup label="' + b + '">' + groups[b].join('') + '</optgroup>' : '';
    }).join('');
  }

  // ── Adicionar item ──
  function openAddItem() {
    openModal(
      '<h3>Adicionar Item ao Estoque</h3>' +
      '<div class="form-grid">' +
        '<label class="full">Produto *<input id="m-product" placeholder="Ex: Samsung Galaxy S24 Ultra" /></label>' +
        '<label>IMEI<input id="m-imei" placeholder="15 dígitos" /></label>' +
        '<label>Código de barras<input id="m-barcode" placeholder="EAN" /></label>' +
        '<label>Marca / Setor *<select id="m-brand"><option value="TIM">TIM</option><option value="MOTOROLA">Motorola</option><option value="SAMSUNG">Samsung</option></select></label>' +
        '<label>Loja *<select id="m-store">' + storeOptions('') + '</select></label>' +
      '</div>' +
      '<div class="form-actions"><button class="btn" id="m-cancel">Cancelar</button><button class="btn btn-primary" id="m-save">Adicionar</button></div>'
    );
    // marca filtra loja
    $('#m-brand').addEventListener('change', function (e) { $('#m-store').innerHTML = storeOptions(e.target.value); });
    $('#m-brand').dispatchEvent(new Event('change'));
    $('#m-cancel').addEventListener('click', closeModal);
    $('#m-save').addEventListener('click', function () {
      var product = $('#m-product').value.trim();
      var imei = $('#m-imei').value.trim();
      var barcode = $('#m-barcode').value.trim();
      var brand = $('#m-brand').value;
      var store = $('#m-store').value;
      if (!product || (!imei && !barcode)) { toast('Informe o produto e ao menos IMEI ou código de barras.', 'error'); return; }
      if (imei && items.some(function (i) { return i.imei === imei; })) { toast('Já existe um item com esse IMEI.', 'error'); return; }
      items.unshift({ id: 'i' + Date.now(), product: product, imei: imei || '—', barcode: barcode || '—', brand: brand, store: store, status: 'AVAILABLE' });
      closeModal(); renderAll(); toast('Item adicionado ao estoque.', 'success');
    });
  }

  // ── Nova transferência (regra: mesma marca) ──
  function openNewTransfer() {
    openModal(
      '<h3>Nova Transferência</h3>' +
      '<p class="hint">Só lojas da mesma marca. A origem define a marca; o destino é filtrado automaticamente.</p>' +
      '<div class="form-grid">' +
        '<label>Loja de origem *<select id="t-from">' + storeOptions('') + '</select></label>' +
        '<label>Loja de destino *<select id="t-to"></select></label>' +
        '<label class="full">Itens (IMEI, separados por vírgula) *<input id="t-items" placeholder="Ex: 356938035643809, 356938035643810" /></label>' +
        '<label class="full">Motivo<input id="t-reason" placeholder="Ex: reposição de estoque" /></label>' +
      '</div>' +
      '<div class="form-actions"><button class="btn" id="t-cancel">Cancelar</button><button class="btn btn-primary" id="t-save">Criar transferência</button></div>'
    );
    function syncDest() {
      var fromCode = $('#t-from').value;
      var brand = STORES[fromCode].brand;
      // destino: mesma marca, exceto a própria origem
      var opts = Object.keys(STORES).filter(function (c) { return STORES[c].brand === brand && c !== fromCode; })
        .map(function (c) { return '<option value="' + c + '">' + STORES[c].name + '</option>'; }).join('');
      $('#t-to').innerHTML = opts || '<option value="">Nenhuma outra loja desta marca</option>';
    }
    $('#t-from').addEventListener('change', syncDest); syncDest();
    $('#t-cancel').addEventListener('click', closeModal);
    $('#t-save').addEventListener('click', function () {
      var from = $('#t-from').value, to = $('#t-to').value;
      var imeis = ($('#t-items').value || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      if (!to) { toast('Não há loja de destino válida para esta marca.', 'error'); return; }
      if (!imeis.length) { toast('Informe ao menos um IMEI.', 'error'); return; }
      // validação de marca (redundante pois destino já é filtrado, mas garante a regra)
      if (STORES[from].brand !== STORES[to].brand) { toast('Transferência só entre a mesma marca.', 'error'); return; }
      var code = 'TRF-2026-' + String(transfers.length + 1).padStart(4, '0');
      transfers.unshift({ code: code, from: from, to: to, brand: STORES[from].brand, count: imeis.length, status: 'PENDING' });
      closeModal(); renderTransfers();
      toast('Transferência ' + code + ' criada. PDF disponível.', 'success');
    });
  }

  // ── Registrar dano (com upload de imagem) ──
  function openNewDamage() {
    openModal(
      '<h3>Registrar Aparelho Danificado</h3>' +
      '<div class="form-grid">' +
        '<label class="full">Aparelho *<input id="d-product" placeholder="Ex: Samsung Galaxy S24 Ultra" /></label>' +
        '<label>IMEI<input id="d-imei" placeholder="15 dígitos" /></label>' +
        '<label>Marca *<select id="d-brand"><option value="TIM">TIM</option><option value="MOTOROLA">Motorola</option><option value="SAMSUNG">Samsung</option></select></label>' +
        '<label>Loja *<select id="d-store">' + storeOptions('') + '</select></label>' +
        '<label>Severidade *<select id="d-sev"><option value="MINOR">Leve</option><option value="MODERATE" selected>Moderado</option><option value="SEVERE">Grave</option><option value="TOTAL">Perda total</option></select></label>' +
        '<label class="full">Descrição do dano *<textarea id="d-desc" rows="3" placeholder="Descreva o dano..."></textarea></label>' +
        '<label class="full">Fotos do aparelho<input type="file" id="d-images" accept="image/*" multiple /></label>' +
      '</div>' +
      '<div id="d-preview" class="img-preview"></div>' +
      '<div class="form-actions"><button class="btn" id="d-cancel">Cancelar</button><button class="btn btn-primary" id="d-save">Registrar e gerar PDF</button></div>'
    );
    $('#d-images').addEventListener('change', function (e) {
      var files = Array.prototype.slice.call(e.target.files).slice(0, 5);
      $('#d-preview').innerHTML = files.map(function (f) {
        return '<div class="img-thumb">' + (f.type.indexOf('image') === 0 ? '🖼️' : '📄') + ' ' + f.name + '</div>';
      }).join('');
    });
    $('#d-cancel').addEventListener('click', closeModal);
    $('#d-save').addEventListener('click', function () {
      var product = $('#d-product').value.trim();
      var desc = $('#d-desc').value.trim();
      var brand = $('#d-brand').value, store = $('#d-store').value, sev = $('#d-sev').value;
      if (!product || desc.length < 10) { toast('Informe o aparelho e uma descrição (mín. 10 caracteres).', 'error'); return; }
      var code = 'DAN-2026-' + String(damages.length + 1).padStart(4, '0');
      damages.unshift({ code: code, product: product, brand: brand, store: store, severity: sev, status: 'REPORTED' });
      closeModal(); renderDamages();
      toast('Dano ' + code + ' registrado. PDF gerado.', 'success');
    });
  }

  renderAll();
})();
