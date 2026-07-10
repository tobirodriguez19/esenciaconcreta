// Aviso por email de venta nueva (EmailJS, sin backend). Best-effort: si el
// envío falla no debe romper ni bloquear el checkout ni el registro de venta
// en el admin, solo se loguea en consola.
window.EC = window.EC || {};
EC.email = function (self) {
  return {
    notifySale: (params) => {
      try {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, params)
          .catch(e => console.error('notifySale failed', e));
      } catch (e) { console.error('notifySale failed', e); }
    }
  };
};
