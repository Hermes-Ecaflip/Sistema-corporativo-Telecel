// =============================================================================
// TELECEL SYSTEM — Login (site independente)
// Ao autenticar com sucesso, redireciona para o site de 2FA.
// =============================================================================

(function () {
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);

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

  // ─── Mostrar/ocultar senha ──────────────────────────────────────────────
  const toggle = $('#toggle-pass');
  const passInput = $('#password');
  toggle?.addEventListener('click', () => {
    const show = passInput.type === 'password';
    passInput.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  });

  // ─── Validação ───────────────────────────────────────────────────────────
  function setError(name, msg) {
    const field = $(`#${name}`).closest('.field');
    const err = $(`.field-error[data-for="${name}"]`);
    if (msg) { field.classList.add('invalid'); err.textContent = msg; }
    else { field.classList.remove('invalid'); err.textContent = ''; }
  }

  function validate(email, password) {
    let ok = true;
    if (!email) { setError('email', 'Informe seu e-mail.'); ok = false; }
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('email', 'E-mail inválido.'); ok = false; }
    else setError('email', '');

    if (!password) { setError('password', 'Informe sua senha.'); ok = false; }
    else if (password.length < 8) { setError('password', 'Mínimo de 8 caracteres.'); ok = false; }
    else setError('password', '');
    return ok;
  }

  ['email', 'password'].forEach((id) =>
    $(`#${id}`)?.addEventListener('input', () => setError(id, ''))
  );

  // ─── Loading ───────────────────────────────────────────────────────────
  function setLoading(btn, loading) {
    const label = $('.btn-label', btn);
    const spinner = $('.spinner', btn);
    btn.disabled = loading;
    if (label) label.style.opacity = loading ? '0.6' : '1';
    if (spinner) spinner.hidden = !loading;
  }

  // ─── Submit ───────────────────────────────────────────────────────────
  const form = $('#login-form');
  const btn = $('#login-submit');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (!validate(email, password)) return;

    setLoading(btn, true);

    // MOCK — no Módulo 15 vira: fetch('/api/v1/auth/login', {...})
    setTimeout(() => {
      setLoading(btn, false);
      showToast('Senha verificada. Redirecionando ao 2FA…', 'success');
      // Guarda o e-mail para a tela de 2FA usar (sessionStorage)
      try { sessionStorage.setItem('tc_email', email); } catch (_) {}
      // Redireciona para o site de 2FA (independente)
      setTimeout(() => { window.location.href = '2fa.html'; }, 700);
    }, 900);
  });

  // ─── Esqueci a senha ──────────────────────────────────────────────────────
  $('#forgot-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = $('#email').value.trim();
    if (!email) { setError('email', 'Digite seu e-mail para recuperar a senha.'); return; }
    showToast('Se o e-mail existir, enviaremos as instruções.', 'success');
  });
})();
