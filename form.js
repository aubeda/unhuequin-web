/*
 * Formulario de usuarios: lo envía a Web3Forms (el `action` del formulario) sin recargar y muestra el resultado en el
 * idioma de la página. El bloque de agradecimiento que lo sustituye va en `data-done`.
 * Sin JavaScript se envía igual y Web3Forms enseña su propia página de confirmación.
 */
(function () {
  'use strict';

  if (!window.fetch || !window.FormData) return;

  var t = function (key) { return window.UH ? window.UH.t(key) : key; };
  /** Campos que no son respuestas de la persona. */
  var TECHNICAL = { access_key: 1, subject: 1, from_name: 1, botcheck: 1, Idioma: 1 };
  /** Un envío más rápido que esto desde que se ve el formulario es de un robot. */
  var MIN_MS = 3000;

  Array.prototype.forEach.call(document.querySelectorAll('form.lead'), function (form) {
    var done = document.getElementById(form.dataset.done);
    var status = form.querySelector('.lead__status');
    var button = form.querySelector('button[type="submit"]');
    var label = form.querySelector('.lead__label');
    var shownAt = Date.now();

    function show(message, isError) {
      status.textContent = message;
      status.classList.toggle('is-error', !!isError);
    }

    function busy(on) {
      button.disabled = on;
      label.textContent = t(on ? 'form.sending' : label.dataset.label);
    }

    function thanks() {
      form.hidden = true;
      done.hidden = false;
      done.setAttribute('tabindex', '-1');
      done.focus();
    }

    function answered(data) {
      var found = false;
      data.forEach(function (value, key) {
        if (!TECHNICAL[key] && String(value).trim()) found = true;
      });
      return found;
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var data = new FormData(form);
      if (!answered(data)) return show(t('form.empty'), true);
      // A un robot se le da las gracias sin enviar nada
      if (data.get('botcheck') || Date.now() - shownAt < MIN_MS) return thanks();
      if (String(data.get('access_key')).indexOf('PON_') === 0) {
        console.warn('Falta la clave de Web3Forms (access_key) en index.html');
        return show(t('form.error'), true);
      }

      // Las casillas marcadas, en un solo campo: el correo se lee mejor
      var services = data.getAll('Servicios');
      data.delete('Servicios');
      if (services.length) data.set('Servicios', services.join(' · '));
      data.set('Idioma', window.UH ? window.UH.lang() : 'es');
      data.delete('botcheck');

      show('', false);
      busy(true);
      fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (body) {
            if (res.ok && body.success !== false) return thanks();
            show(t(res.status === 429 ? 'form.tooMany' : 'form.error'), true);
          });
        })
        .catch(function () { show(t('form.error'), true); })
        .then(function () { busy(false); });
    });
  });
})();
