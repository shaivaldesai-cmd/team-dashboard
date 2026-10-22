// Shared by index.html (Home), calling.html, diagnostics.html (2026-10-18) and
// settings.html (2026-10-22, the only page that writes: dash.save).
// Data: the team-dashboard edge function (JSON; Supabase can't serve HTML).
// Sign in with dashboard.user / dashboard.pass, or open a page once with
// #key=<dashboard.secret> (the fragment never reaches a server; it is kept in
// localStorage, same key as the old pages, so existing sign-ins carry over).
(function () {
  // window.DASH_API: local preview against a mock (never set on the live site)
  const API = window.DASH_API || "https://xuerxrbtofhxdwxglynr.supabase.co/functions/v1/team-dashboard";
  const LS = "petpooja_dash_creds";

  function creds() {
    const h = new URLSearchParams(location.hash.slice(1));
    if (h.get("key")) {
      try { localStorage.setItem(LS, JSON.stringify({ key: h.get("key") })); } catch { /* private mode */ }
      history.replaceState(null, "", location.pathname + location.search);
      return { key: h.get("key") };
    }
    try { return JSON.parse(localStorage.getItem(LS)) || null; } catch { return null; }
  }

  class AuthError extends Error {}

  async function call(params, body) {
    const c = creds();
    if (!c) throw new AuthError("signed out");
    const q = new URLSearchParams(params);
    if (c.key) q.set("key", c.key); else { q.set("user", c.user || ""); q.set("pass", c.pass || ""); }
    const r = await fetch(`${API}?${q}`, body === undefined ? undefined
      : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.status === 401) { try { localStorage.removeItem(LS); } catch { /* ignore */ } throw new AuthError("unauthorized"); }
    const d = await r.json().catch(() => null);
    if (!d || !d.ok) throw new Error((d && d.error) || `HTTP ${r.status}`);
    return d;
  }

  // a sign-in card over the page; resolves once credentials are saved
  function askLogin(failed) {
    return new Promise((resolve) => {
      let box = document.getElementById("dash-login");
      if (!box) {
        box = document.createElement("div");
        box.id = "dash-login";
        box.innerHTML =
          `<form><b>Payroll sales dashboard</b><p class="err" hidden>Wrong username or password.</p>` +
          `<input name="u" placeholder="Username" autocomplete="username" required>` +
          `<input name="p" type="password" placeholder="Password" autocomplete="current-password" required>` +
          `<button type="submit">Sign in</button></form>`;
        document.body.append(box);
      }
      box.querySelector(".err").hidden = !failed;
      box.style.display = "grid";
      const form = box.querySelector("form");
      form.onsubmit = (e) => {
        e.preventDefault();
        try { localStorage.setItem(LS, JSON.stringify({ user: form.u.value.trim(), pass: form.p.value })); } catch { /* ignore */ }
        box.style.display = "none";
        resolve();
      };
      form.u.focus();
    });
  }

  async function load(params, body) {
    let failed = false;
    for (;;) {
      try { return await call(params, body); }
      catch (e) {
        if (!(e instanceof AuthError)) throw e;
        await askLogin(failed);
        failed = true;
      }
    }
  }

  // hover / focus tooltips for every [data-tip]
  function tooltips() {
    const tip = document.getElementById("tip");
    if (!tip) return;
    const place = (x0, y0) => {
      const pad = 14, w = tip.offsetWidth, h = tip.offsetHeight;
      let x = x0 + pad, y = y0 + pad;
      if (x + w > innerWidth - 8) x = x0 - w - pad;
      if (y + h > innerHeight - 8) y = y0 - h - pad;
      tip.style.left = Math.max(8, x) + "px"; tip.style.top = Math.max(8, y) + "px";
    };
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-tip]"); if (!t || !t.dataset.tip) return;
      tip.textContent = t.dataset.tip; tip.classList.add("show"); place(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", (e) => { if (tip.classList.contains("show")) place(e.clientX, e.clientY); });
    document.addEventListener("mouseout", (e) => { if (e.target.closest("[data-tip]")) tip.classList.remove("show"); });
    document.addEventListener("focusin", (e) => {
      const t = e.target.closest("[data-tip]"); if (!t || !t.dataset.tip) return;
      const r = t.getBoundingClientRect(); tip.textContent = t.dataset.tip; tip.classList.add("show"); place(r.right, r.bottom);
    });
    document.addEventListener("focusout", () => tip.classList.remove("show"));
  }

  // IST calendar helpers (the API's days are IST days)
  const istToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
  const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * 86400000).toISOString().slice(0, 10);
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dm = (d) => `${Number(d.slice(8, 10))} ${MON[Number(d.slice(5, 7)) - 1]}`;
  const range = (a, b) => (a === b ? dm(a) : a.slice(0, 7) === b.slice(0, 7) ? `${Number(a.slice(8, 10))}–${dm(b)}` : `${dm(a)} – ${dm(b)}`);
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const save = (params, body) => load(params, body);

  window.dash = { load, save, tooltips, istToday, addDays, dm, range, esc };
})();
