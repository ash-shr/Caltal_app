// Emailed links carry their secret after the # ("/reset-password#token=...").
// Browsers never send that part to any server, so the secret can't end up in
// a server log or be passed on to another site as this page's address.
export function tokenFromLink() {
  return new URLSearchParams(window.location.hash.slice(1)).get('token');
}

// Once a link has done its job, take its secret out of the address bar (and
// so out of the browser's history).
export function forgetLinkToken() {
  window.history.replaceState(null, '', window.location.pathname);
}
