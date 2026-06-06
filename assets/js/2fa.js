// =============================================================================
// TELECEL SYSTEM — Verificação 2FA (site independente)
// =============================================================================

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  // ─── Toast ───────────────────────────────────────────────────────────
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg, type = '') {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.className = 'toast show ' + type;
    toast.hidden = false;
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => (toast.hidden = true), 250);
    }, 3200);
  }

  function setLoading(btn, loading) {
    const label = $('.btn-label', btn);
    const spinner = $('.spinner', btn);
    btn.disabled = loading;
    if (label) label.style.opacity = loading ? '0.6' : '1';
    if (spinner) spinner.hidden = !loading;
  }

  // ─── Inputs OTP ───────────────────────────────────────────────────────────
  const otpBoxes = $$('.otp-box');

  otpBoxes.forEach((box, i) => {
    box.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '');
      if (e.target.value) {
        box.classList.add('filled');
        if (i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
      } else {
        box.classList.remove('filled');
      }
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) {
        otpBoxes[i - 1].focus();
        otpBoxes[i - 1].value = '';
        otpBoxes[i - 1].classList.remove('filled');
      }
      if (e.key === 'ArrowLeft' && i > 0) otpBoxes[i - 1].focus();
      if (e.key === 'ArrowRight' && i < otpBoxes.length - 1) otpBoxes[i + 1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
      digits.split('').forEach((d, idx) => {
        if (otpBoxes[idx]) { otpBoxes[idx].value = d; otpBoxes[idx].classList.add('filled'); }
      });
      otpBoxes[Math.min(digits.length, 5)].focus();
    });
  });

  const getCode = () => otpBoxes.map((b) => b.value).join('');

  // ─── Submit ───────────────────────────────────────────────────────────
  const form = $('#twofa-form');
  const btn = $('#verify-submit');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = getCode();
    if (code.length !== 6) {
      showToast('Digite os 6 dígitos do código.', 'error');
      otpBoxes.find((b) => !b.value)?.focus();
      return;
    }
    setLoading(btn, true);
    // MOCK — no Módulo 15: fetch('/api/v1/auth/2fa/verify', {...})
    setTimeout(() => {
      setLoading(btn, false);
      showToast('Autenticado! Redirecionando ao dashboard…', 'success');
      setTimeout(() => { window.location.href = 'dashboard.html'; }, 700);
    }, 900);
  });

  // ─── Contagem regressiva ────────────────────────────────────────────────
  const countdownEl = $('#otp-countdown');
  let timer, secs = 25;
  function tick() {
    secs--;
    if (secs <= 0) { countdownEl.textContent = 'expirado'; clearInterval(timer); return; }
    countdownEl.textContent = secs + 's';
  }
  countdownEl.textContent = secs + 's';
  timer = setInterval(tick, 1000);

  // ─── QR decorativo ───────────────────────────────────────────────────────
  (function renderQR() {
    const svg = $('#qr-svg');
    if (!svg) return;
    const N = 21, cell = 100 / N;
    let rects = '';
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const finderZone = (x < 7 && y < 7) || (x >= N - 7 && y < 7) || (x < 7 && y >= N - 7);
        const seed = (x * 31 + y * 17 + x * y) % 7;
        if (!finderZone && seed < 3) {
          rects += `<rect x="${(x*cell).toFixed(2)}" y="${(y*cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#1f2430"/>`;
        }
      }
    }
    const finder = (fx, fy) => `
      <rect x="${fx}" y="${fy}" width="${cell*7}" height="${cell*7}" fill="#1f2430"/>
      <rect x="${fx+cell}" y="${fy+cell}" width="${cell*5}" height="${cell*5}" fill="#fff"/>
      <rect x="${fx+cell*2}" y="${fy+cell*2}" width="${cell*3}" height="${cell*3}" fill="#1f2430"/>`;
    svg.innerHTML = `<rect width="100" height="100" fill="#fff"/>` + rects +
      finder(0, 0) + finder(cell*(N-7), 0) + finder(0, cell*(N-7));
  })();

  // Foca o primeiro campo ao carregar
  otpBoxes[0]?.focus();

  // Mostra o e-mail que veio do login, se houver
  try {
    const email = sessionStorage.getItem('tc_email');
    if (email) console.log('Verificando 2FA para:', email);
  } catch (_) {}
})();
