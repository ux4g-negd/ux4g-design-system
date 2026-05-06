/*!
 * UX4G.js
 * Components: Dropdown, Collapse/Accordion, Modal, Offcanvas, Tooltip, Popover, Toast, Carousel, Tabs, Scrollspy
 * Compatibility: UX4G markup (data-ux-*)
 * Extras: supports .open-modal/.close-modal, .close-toast, #liveToastBtn (your sample HTML)
 * Version: 1.1.0
 */

(function (global) {
  "use strict";

  // -----------------------------
  // Utilities
  // -----------------------------
  const U = {
    qs(sel, root = document) { return root.querySelector(sel); },
    qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    on(el, evt, cb, opts) { el && el.addEventListener(evt, cb, opts); },
    off(el, evt, cb, opts) { el && el.removeEventListener(evt, cb, opts); },
    closest(el, sel) { return el ? el.closest(sel) : null; },
    isVisible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); },
    reflow(el) { return el && el.offsetHeight; },
    attr(el, name, fallback = null) {
      if (!el) return fallback;
      const v = el.getAttribute(name);
      return v == null ? fallback : v;
    },
    // Prefer UX4G attributes
    data(el, key, fallback = null) {
      if (!el) return fallback;
      const ux = el.getAttribute(`data-ux-${key}`);
      if (ux != null) return ux;
      const bs = el.getAttribute(`data-bs-${key}`);
      if (bs != null) return bs;
      const ux4g = el.getAttribute(`ux4g-${key}`);
      if (ux4g != null) return ux4g;
      return fallback;
    },
    bool(v, fallback = false) {
      if (v == null) return fallback;
      if (typeof v === "boolean") return v;
      const s = String(v).trim().toLowerCase();
      if (s === "" || s === "true" || s === "1") return true;
      if (s === "false" || s === "0") return false;
      return fallback;
    },
    num(v, fallback = 0) {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    },
    dispatch(el, name, detail) {
      if (!el) return;
      el.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
    },
    focusables(root) {
      if (!root) return [];
      const sel = [
        "a[href]",
        "area[href]",
        "button:not([disabled])",
        "input:not([disabled]):not([type='hidden'])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
        "[contenteditable='true']"
      ].join(",");
      return U.qsa(sel, root).filter(U.isVisible);
    },
    // Body scroll lock (simple)
    lockBody(lock) {
      const cls = "ux4g-scroll-lock";
      if (lock) document.body.classList.add(cls);
      else document.body.classList.remove(cls);
    },
    ensureBackdrop(kind) {
      let bd = U.qs(`.ux4g-backdrop[data-kind="${kind}"]`);
      if (!bd) {
        bd = document.createElement("div");
        bd.className = "ux4g-backdrop";
        bd.setAttribute("data-kind", kind);
        document.body.appendChild(bd);
      }
      return bd;
    },
    removeBackdrop(kind) {
      const bd = U.qs(`.ux4g-backdrop[data-kind="${kind}"]`);
      if (bd) bd.remove();
    },
    // Lightweight positioning (NOT Popper-perfect)
    placeFloating(target, floating, placement = "bottom", offset = 8) {
      if (!target || !floating) return;

      const rect = target.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      // Temporary show to measure
      const originalDisplay = floating.style.display;
      const originalVisibility = floating.style.visibility;
      floating.style.display = "block";
      floating.style.visibility = "hidden";
      
      const fr = floating.getBoundingClientRect();
      
      floating.style.display = originalDisplay;
      floating.style.visibility = originalVisibility;

      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

      const want = placement;
      const [wantedSide] = want.split("-");
      const tries = [want];
      const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" };
      const sideFallback = opposite[wantedSide];
      if (sideFallback) {
        tries.push(want.replace(wantedSide, sideFallback));
      }
      ["bottom", "top", "right", "left"].forEach(s => {
        if (!tries.includes(s)) tries.push(s);
      });

      const compute = (p) => {
        let t = 0, l = 0;
        const [side, align] = p.split("-");
        
        if (side === "top") {
          t = rect.top - fr.height - offset;
          if (align === "start") l = rect.left;
          else if (align === "end") l = rect.right - fr.width;
          else l = rect.left + (rect.width - fr.width) / 2;
        } else if (side === "bottom") {
          t = rect.bottom + offset;
          if (align === "start") l = rect.left;
          else if (align === "end") l = rect.right - fr.width;
          else l = rect.left + (rect.width - fr.width) / 2;
        } else if (side === "left") {
          l = rect.left - fr.width - offset;
          if (align === "start") t = rect.top;
          else if (align === "end") t = rect.bottom - fr.height;
          else t = rect.top + (rect.height - fr.height) / 2;
        } else if (side === "right") {
          l = rect.right + offset;
          if (align === "start") t = rect.top;
          else if (align === "end") t = rect.bottom - fr.height;
          else t = rect.top + (rect.height - fr.height) / 2;
        } else {
          t = rect.bottom + offset;
          l = rect.left + (rect.width - fr.width) / 2;
          p = "bottom";
        }
        return { t, l, p };
      };

      let chosen = null;
      for (const p of tries) {
        const c = compute(p);
        const fitsH = c.t >= 0 && (c.t + fr.height) <= vh;
        const fitsW = c.l >= 0 && (c.l + fr.width) <= vw;
        if (fitsH && fitsW) { chosen = c; break; }
      }
      if (!chosen) chosen = compute(want);

      const top = clamp(chosen.t, 8, Math.max(8, vh - fr.height - 8));
      const left = clamp(chosen.l, 8, Math.max(8, vw - fr.width - 8));

      floating.style.position = "fixed";
      floating.style.top = `${top}px`;
      floating.style.left = `${left}px`;
      floating.setAttribute("data-placement", chosen.p);
      
      const isTooltip = floating.classList.contains('ux4g-tooltip');
      const baseClass = isTooltip ? 'ux4g-tooltip' : 'ux4g-popover';
      
      const placementPrefix = `${baseClass}-`;
      for (const cls of Array.from(floating.classList)) {
        if (cls.startsWith(placementPrefix) && cls !== baseClass) {
          floating.classList.remove(cls);
        }
      }
      floating.classList.add(`${placementPrefix}${chosen.p}`);
    }
  };

  const Registry = new WeakMap();
  const getI = (el, key) => (Registry.get(el)?.[key]) || null;
  const setI = (el, key, inst) => {
    let map = Registry.get(el);
    if (!map) { map = {}; Registry.set(el, map); }
    map[key] = inst;
  };

  const escapeHtml = (s) => String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  // -----------------------------
  // Dropdown
  // -----------------------------
  class Dropdown {
    constructor(toggle) {
      this.toggle = toggle;
      this.menu = this._findMenu(toggle);
      this._open = false;

      U.on(this.toggle, "click", (e) => {
        e.preventDefault();
        this.toggleDropdown();
      });

      U.on(document, "click", (e) => {
        if (!this._open) return;
        if (this.menu && (this.menu.contains(e.target) || this.toggle.contains(e.target))) return;
        this.hide();
      });

      U.on(document, "keydown", (e) => {
        if (!this._open) return;
        if (e.key === "Escape") {
          this.hide();
          this.toggle.focus();
        }
      });
    }

    _findMenu(toggle) {
      // Standard dropdown structure: .dropdown > [toggle] + .dropdown-menu
      const parent = toggle.parentElement;
      let menu = parent ? parent.querySelector(".dropdown-menu") : null;
      if (!menu) {
        const target = U.data(toggle, "target") || U.attr(toggle, "aria-controls");
        if (target && target.startsWith("#")) menu = U.qs(target);
      }
      return menu;
    }

    show() {
      if (!this.menu) return;
      this._open = true;
      this.toggle.classList.add("show");
      this.menu.classList.add("show");
      this.toggle.setAttribute("aria-expanded", "true");

      const placement = U.data(this.toggle, "placement", "bottom");
      const offset = U.num(U.data(this.toggle, "offset", 6), 6);
      U.placeFloating(this.toggle, this.menu, placement, offset);

      U.dispatch(this.toggle, "ux4g.dropdown.shown", { menu: this.menu });
    }

    hide() {
      if (!this.menu) return;
      this._open = false;
      this.toggle.classList.remove("show");
      this.menu.classList.remove("show");
      this.toggle.setAttribute("aria-expanded", "false");
      U.dispatch(this.toggle, "ux4g.dropdown.hidden", { menu: this.menu });
    }

    toggleDropdown() { this._open ? this.hide() : this.show(); }

    static getOrCreate(el) {
      let inst = getI(el, "dropdown");
      if (!inst) { inst = new Dropdown(el); setI(el, "dropdown", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Collapse / Accordion
  // -----------------------------
  class Collapse {
    constructor(trigger) {
      this.trigger = trigger;
      this.target = this._resolveTarget(trigger);
      // ux4g accordion uses data-bs-parent on .collapse
      this.parentSel = U.data(this.target, "parent") || U.data(this.trigger, "parent");
      this.duration = this._readDuration(this.target, 200);

      U.on(this.trigger, "click", (e) => {
        e.preventDefault();
        this.toggle();
      });
    }

    _resolveTarget(trigger) {
      const sel = U.data(trigger, "target") || U.attr(trigger, "href") || U.attr(trigger, "aria-controls") || U.attr(trigger, "ux4g-target");
      if (sel && sel.startsWith("#")) return U.qs(sel);
      return U.qs("#" + sel);
    }

    _readDuration(el, fallbackMs) {
      if (!el) return fallbackMs;
      const d = getComputedStyle(el).transitionDuration || "";
      const ms = d.includes("ms") ? parseFloat(d) : (d.includes("s") ? parseFloat(d) * 1000 : NaN);
      return Number.isFinite(ms) && ms > 0 ? ms : fallbackMs;
    }

    show() {
      if (!this.target) return;

      // Accordion: close other open within parent
      if (this.parentSel) {
        const parent = U.qs(this.parentSel);
        if (parent) {
          U.qsa(".collapse.show", parent).forEach((el) => {
            if (el === this.target) return;
            el.classList.remove("show");
            // update triggers for that element
            if (el.id) {
              U.qsa(`[data-bs-target="#${el.id}"],[data-ux-target="#${el.id}"],[ux4g-target="#${el.id}"],a[href="#${el.id}"]`)
                .forEach(t => {
                  t.classList.add("collapsed");
                  t.setAttribute("aria-expanded", "false");
                });
            }
          });
        }
      }

      // Animate height
      this.target.classList.add("collapsing");
      this.target.classList.remove("collapse");
      this.target.style.height = "0px";
      U.reflow(this.target);

      const h = this.target.scrollHeight;
      this.target.style.height = h + "px";

      this.trigger.classList.remove("collapsed");
      this.trigger.setAttribute("aria-expanded", "true");

      window.setTimeout(() => {
        this.target.classList.remove("collapsing");
        this.target.classList.add("collapse", "show");
        this.target.style.height = "";
        U.dispatch(this.target, "ux4g.collapse.shown", {});
      }, this.duration);
    }

    hide() {
      if (!this.target) return;

      this.target.style.height = this.target.getBoundingClientRect().height + "px";
      U.reflow(this.target);

      this.target.classList.add("collapsing");
      this.target.classList.remove("collapse", "show");

      this.trigger.classList.add("collapsed");
      this.trigger.setAttribute("aria-expanded", "false");

      window.setTimeout(() => {
        this.target.style.height = "0px";
      }, 10);

      window.setTimeout(() => {
        this.target.classList.remove("collapsing");
        this.target.classList.add("collapse");
        this.target.style.height = "";
        U.dispatch(this.target, "ux4g.collapse.hidden", {});
      }, this.duration);
    }

    toggle() {
      if (!this.target) return;
      this.target.classList.contains("show") ? this.hide() : this.show();
    }

    static getOrCreate(el) {
      let inst = getI(el, "collapse");
      if (!inst) { inst = new Collapse(el); setI(el, "collapse", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Modal
  // -----------------------------
  class Modal {
    constructor(el) {
      this.el = el;
      this._shown = false;
      this._bdKind = "modal";
      this._lastFocus = null;
      this.duration = this._readDuration(el, 250);

      // Dismiss buttons inside
      U.on(this.el, "click", (e) => {
        const dismiss = U.closest(e.target, '[data-bs-dismiss="modal"],[data-ux-dismiss="modal"],.close-modal');
        if (dismiss) {
          e.preventDefault();
          this.hide();
        }
      });

      // ESC + trap
      U.on(document, "keydown", (e) => {
        if (!this._shown) return;
        if (e.key === "Escape") {
          const kb = U.bool(U.data(this.el, "keyboard", "true"), true);
          if (kb) this.hide();
        } else if (e.key === "Tab") {
          this._trapTab(e);
        }
      });
    }

    _readDuration(el, fallbackMs) {
      if (!el) return fallbackMs;
      const d = getComputedStyle(el).transitionDuration || "";
      const ms = d.includes("ms") ? parseFloat(d) : (d.includes("s") ? parseFloat(d) * 1000 : NaN);
      return Number.isFinite(ms) && ms > 0 ? ms : fallbackMs;
    }

    _trapTab(e) {
      const f = U.focusables(this.el);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    show(trigger) {
      if (this._shown) return;
      this._shown = true;
      this._lastFocus = document.activeElement;

      const backdropOpt = U.data(this.el, "backdrop", "true");
      const backdrop = backdropOpt !== "false";

      if (backdrop) {
        const bd = U.ensureBackdrop(this._bdKind);
        bd.classList.add("show");
        U.on(bd, "click", () => {
          if (backdropOpt === "static") return;
          this.hide();
        });
      }

      U.lockBody(true);

      // ux4g expects display none -> block
      this.el.style.display = "block";
      this.el.removeAttribute("aria-hidden");
      this.el.setAttribute("aria-modal", "true");
      this.el.setAttribute("role", this.el.getAttribute("role") || "dialog");

      U.reflow(this.el);
      this.el.classList.add("show");

      const focus = U.bool(U.data(this.el, "focus", "true"), true);
      if (focus) {
        const f = U.focusables(this.el);
        (f[0] || this.el).focus({ preventScroll: true });
      }

      U.dispatch(this.el, "ux4g.modal.shown", { relatedTarget: trigger || null });
    }

    hide() {
      if (!this._shown) return;
      this._shown = false;

      this.el.classList.remove("show");
      this.el.setAttribute("aria-hidden", "true");
      this.el.removeAttribute("aria-modal");

      window.setTimeout(() => {
        this.el.style.display = "none";
        U.lockBody(false);
        U.removeBackdrop(this._bdKind);

        if (this._lastFocus && typeof this._lastFocus.focus === "function") {
          this._lastFocus.focus({ preventScroll: true });
        }
        U.dispatch(this.el, "ux4g.modal.hidden", {});
      }, this.duration);
    }

    toggle(trigger) { this._shown ? this.hide() : this.show(trigger); }

    static getOrCreate(el) {
      let inst = getI(el, "modal");
      if (!inst) { inst = new Modal(el); setI(el, "modal", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Offcanvas
  // -----------------------------
  class Offcanvas {
    constructor(el) {
      this.el = el;
      this._shown = false;
      this._bdKind = "offcanvas";
      this._lastFocus = null;
      this.duration = this._readDuration(el, 250);

      U.on(this.el, "click", (e) => {
        const dismiss = U.closest(e.target, '[data-bs-dismiss="offcanvas"],[data-ux-dismiss="offcanvas"]');
        if (dismiss) {
          e.preventDefault();
          this.hide();
        }
      });

      U.on(document, "keydown", (e) => {
        if (!this._shown) return;
        if (e.key === "Escape") {
          const kb = U.bool(U.data(this.el, "keyboard", "true"), true);
          if (kb) this.hide();
        } else if (e.key === "Tab") {
          this._trapTab(e);
        }
      });
    }

    _readDuration(el, fallbackMs) {
      if (!el) return fallbackMs;
      const d = getComputedStyle(el).transitionDuration || "";
      const ms = d.includes("ms") ? parseFloat(d) : (d.includes("s") ? parseFloat(d) * 1000 : NaN);
      return Number.isFinite(ms) && ms > 0 ? ms : fallbackMs;
    }

    _trapTab(e) {
      const f = U.focusables(this.el);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }

    show(trigger) {
      if (this._shown) return;
      this._shown = true;
      this._lastFocus = document.activeElement;

      const backdropOpt = U.data(this.el, "backdrop", "true");
      const backdrop = backdropOpt !== "false";

      if (backdrop) {
        const bd = U.ensureBackdrop(this._bdKind);
        bd.classList.add("show");
        U.on(bd, "click", () => {
          if (backdropOpt === "static") return;
          this.hide();
        });
      }

      U.lockBody(true);
      this.el.style.visibility = "visible";
      this.el.classList.add("show");
      this.el.setAttribute("aria-modal", "true");

      const focus = U.bool(U.data(this.el, "focus", "true"), true);
      if (focus) {
        const f = U.focusables(this.el);
        (f[0] || this.el).focus({ preventScroll: true });
      }

      U.dispatch(this.el, "ux4g.offcanvas.shown", { relatedTarget: trigger || null });
    }

    hide() {
      if (!this._shown) return;
      this._shown = false;

      this.el.classList.remove("show");
      this.el.removeAttribute("aria-modal");

      window.setTimeout(() => {
        this.el.style.visibility = "";
        U.lockBody(false);
        U.removeBackdrop(this._bdKind);

        if (this._lastFocus && typeof this._lastFocus.focus === "function") {
          this._lastFocus.focus({ preventScroll: true });
        }
        U.dispatch(this.el, "ux4g.offcanvas.hidden", {});
      }, this.duration);
    }

    toggle(trigger) { this._shown ? this.hide() : this.show(trigger); }

    static getOrCreate(el) {
      let inst = getI(el, "offcanvas");
      if (!inst) { inst = new Offcanvas(el); setI(el, "offcanvas", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Tooltip / Popover (lightweight)
  // -----------------------------
  class Floating {
    constructor(el, kind) {
      this.el = el;
      this.kind = kind; // tooltip | popover
      this._open = false;
      this._floating = null;

      this.placement = U.data(el, "placement", kind === "tooltip" ? "top" : "right");
      this.offset = U.num(U.data(el, "offset", 8), 8);
      this.trigger = U.data(el, "trigger", kind === "tooltip" ? "hover focus" : "click");
      this.html = U.bool(U.data(el, "html", "false"), false);

      this._bind();
    }

    _getContent() {
      const content = U.data(this.el, "content");
      if (this.kind === "popover") {
        const title = U.data(this.el, "title") || this.el.getAttribute("title") || "";
        const subtitle = U.data(this.el, "subtitle") || "";
        const icon = U.data(this.el, "icon") || "";
        const label = U.data(this.el, "label") || "";
        const actionHtml = U.data(this.el, "action-html") || "";

        const t = this.html ? String(title) : escapeHtml(title);
        const s = this.html ? String(subtitle) : escapeHtml(subtitle);
        const c = this.html ? String(content || "") : escapeHtml(content || "");
        const i = this.html ? String(icon) : escapeHtml(icon);
        const l = this.html ? String(label) : escapeHtml(label);

        let inner = "";
        if (t || s) {
          inner += `<div class="ux4g-popover-header">
            <div class="ux4g-popover-title-row">
              <div class="ux4g-popover-title">
                ${i ? `<i class="ux4g-icon">${i}</i>` : ""}
                <span>${t}</span>
                ${l ? `<span class="ux4g-tag-outline-brand">${l}</span>` : ""}
              </div>
              ${actionHtml ? `
                  ${actionHtml}
              ` : ""}
            </div>
            ${s ? `<div class="ux4g-popover-subtitle">${s}</div>` : ""}
          </div>`;
        }
        inner += `<div class="ux4g-popover-body">${c}</div>`;
        
        const hasArrow = U.bool(U.data(this.el, "arrow", "true"), true);
        if (hasArrow) {
          inner += '<div class="ux4g-popover-arrow"><i class="ux4g-icon">arrow_drop_up</i></div>';
        }
        
        return inner;
      }

      const t = content != null ? content : (this.el.getAttribute("title") || "");
      return this.html ? String(t) : escapeHtml(t);
    }

    _create() {
      if (this._floating) return;
      const div = document.createElement("div");
      div.className = this.kind === "tooltip" ? "ux4g-tooltip" : "ux4g-popover";
      div.setAttribute("role", this.kind === "tooltip" ? "tooltip" : "dialog");
      
      const hasArrow = U.bool(U.data(this.el, "arrow", "true"), true);
      if (!hasArrow) {
        div.classList.add("ux4g-popover-no-arrow");
      }

      div.innerHTML = this._getContent() || "";
      document.body.appendChild(div);
      this._floating = div;
    }

    show() {
      if (this._open) return;
      this._open = true;

      // Prevent native tooltip doubling
      if (this.kind === "tooltip") {
        const t = this.el.getAttribute("title");
        if (t != null) {
          this.el.setAttribute("data-ux-original-title", t);
          this.el.removeAttribute("title");
        }
      }

      this._create();
      this._floating.style.display = "block";
      this._floating.classList.add("show");
      
      init(this._floating);
      
      const update = () => {
        if (!this._open) return;
        U.placeFloating(this.el, this._floating, this.placement, this.offset);
        this._raf = requestAnimationFrame(update);
      };
      this._onWin = update;
      this._raf = requestAnimationFrame(update);

      U.on(window, "scroll", this._onWin, { capture: true, passive: true });
      U.on(window, "resize", this._onWin);

      U.dispatch(this.el, `ux4g.${this.kind}.shown`, {});
    }

    hide() {
      if (!this._open) return;
      this._open = false;

      if (this._floating) {
        this._floating.classList.remove("show");
        this._floating.style.display = "none";
      }

      if (this.kind === "tooltip") {
        const ot = this.el.getAttribute("data-ux-original-title");
        if (ot != null) {
          this.el.setAttribute("title", ot);
          this.el.removeAttribute("data-ux-original-title");
        }
      }

      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }

      if (this._onWin) {
        U.off(window, "scroll", this._onWin, { capture: true });
        U.off(window, "resize", this._onWin);
        this._onWin = null;
      }

      U.dispatch(this.el, `ux4g.${this.kind}.hidden`, {});
    }

    toggle() { this._open ? this.hide() : this.show(); }

    _bind() {
      let triggers = String(this.trigger).split(/\s+/).filter(Boolean);
      
      if (this.kind === "popover") {
        triggers = triggers.filter(t => t !== "hover");
        if (!triggers.length) triggers = ["click"];
      }

      if (triggers.includes("hover")) {
        U.on(this.el, "mouseenter", () => this.show());
        U.on(this.el, "mouseleave", () => this.hide());
      }
      if (triggers.includes("focus")) {
        U.on(this.el, "focus", () => this.show());
        U.on(this.el, "blur", () => this.hide());
      }
      if (triggers.includes("click")) {
        U.on(this.el, "click", (e) => { e.preventDefault(); this.toggle(); });

        U.on(document, "click", (e) => {
          if (!this._open) return;
          if (this.el.contains(e.target) || (this._floating && this._floating.contains(e.target))) return;
          this.hide();
        });

        U.on(document, "keydown", (e) => {
          if (!this._open) return;
          if (e.key === "Escape") this.hide();
        });
      }
    }

    static getOrCreate(el, kind) {
      const key = kind;
      let inst = getI(el, key);
      if (!inst) { inst = new Floating(el, kind); setI(el, key, inst); }
      return inst;
    }
  }

  // -----------------------------
  // Toast
  // -----------------------------
  class Toast {
    constructor(el) {
      this.el = el;
      this._timer = null;

      U.on(this.el, "click", (e) => {
        const dismiss = U.closest(e.target, '[data-bs-dismiss="toast"],[data-ux-dismiss="toast"],.close-toast');
        if (dismiss) {
          e.preventDefault();
          this.hide();
        }
      });
    }

    show() {
      this.el.classList.add("show");
      this.el.classList.remove("hide");

      const autohide = U.bool(U.data(this.el, "autohide", "true"), true);
      const delay = U.num(U.data(this.el, "delay", 5000), 5000);

      if (autohide) {
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.hide(), delay);
      }
      U.dispatch(this.el, "ux4g.toast.shown", {});
    }

    hide() {
      this.el.classList.remove("show");
      this.el.classList.add("hide");
      clearTimeout(this._timer);
      U.dispatch(this.el, "ux4g.toast.hidden", {});
    }

    static getOrCreate(el) {
      let inst = getI(el, "toast");
      if (!inst) { inst = new Toast(el); setI(el, "toast", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Carousel
  // -----------------------------
  class Carousel {
    constructor(el) {
      this.el = el;
      this.items = U.qsa(".carousel-item", el);
      this.indicators = U.qsa("[data-bs-slide-to],[data-ux-slide-to]", el);
      this.interval = U.num(U.data(el, "interval", 5000), 5000);
      this.ride = U.data(el, "ride");
      this.pause = U.data(el, "pause", "hover");
      this.wrap = U.bool(U.data(el, "wrap", "true"), true);
      this._timer = null;

      U.on(el, "click", (e) => {
        const prev = U.closest(e.target, '[data-bs-slide="prev"],[data-ux-slide="prev"]');
        const next = U.closest(e.target, '[data-bs-slide="next"],[data-ux-slide="next"]');
        if (prev) { e.preventDefault(); this.prev(); }
        if (next) { e.preventDefault(); this.next(); }

        const ind = U.closest(e.target, "[data-bs-slide-to],[data-ux-slide-to]");
        if (ind) {
          e.preventDefault();
          const v = ind.getAttribute("data-bs-slide-to") ?? ind.getAttribute("data-ux-slide-to");
          this.to(U.num(v, 0));
        }
      });

      if (this.pause === "hover") {
        U.on(el, "mouseenter", () => this._stop());
        U.on(el, "mouseleave", () => this._start());
      }

      if (this.ride === "carousel") this._start();
    }

    _activeIndex() {
      const idx = this.items.findIndex(i => i.classList.contains("active"));
      return idx >= 0 ? idx : 0;
    }

    _setActive(nextIndex) {
      if (!this.items.length) return;
      const cur = this._activeIndex();

      if (nextIndex < 0) nextIndex = this.wrap ? this.items.length - 1 : 0;
      if (nextIndex >= this.items.length) nextIndex = this.wrap ? 0 : this.items.length - 1;
      if (cur === nextIndex) return;

      this.items[cur]?.classList.remove("active");
      this.items[nextIndex]?.classList.add("active");

      this.indicators.forEach(ind => ind.classList.remove("active"));
      const ind = this.indicators.find(x => {
        const v = x.getAttribute("data-bs-slide-to") ?? x.getAttribute("data-ux-slide-to");
        return U.num(v, -1) === nextIndex;
      });
      if (ind) ind.classList.add("active");

      U.dispatch(this.el, "ux4g.carousel.slid", { from: cur, to: nextIndex });
    }

    next() { this._setActive(this._activeIndex() + 1); }
    prev() { this._setActive(this._activeIndex() - 1); }
    to(i) { this._setActive(i); }

    _start() {
      if (this._timer || this.interval <= 0) return;
      this._timer = setInterval(() => this.next(), this.interval);
    }

    _stop() { clearInterval(this._timer); this._timer = null; }

    static getOrCreate(el) {
      let inst = getI(el, "carousel");
      if (!inst) { inst = new Carousel(el); setI(el, "carousel", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Tabs
  // -----------------------------
  class Tab {
    constructor(el) {
      this.el = el;

      U.on(el, "click", (e) => { e.preventDefault(); this.show(); });

      U.on(el, "keydown", (e) => {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        const list = U.closest(this.el, ".nav, [role='tablist']");
        if (!list) return;

        const tabs = U.qsa("[data-bs-toggle='tab'],[data-ux-toggle='tab'],[role='tab']", list);
        const idx = tabs.indexOf(this.el);
        if (idx < 0) return;

        e.preventDefault();
        const next = (e.key === "ArrowRight") ? idx + 1 : idx - 1;
        const wrapIdx = (next + tabs.length) % tabs.length;
        tabs[wrapIdx].focus();
        Tab.getOrCreate(tabs[wrapIdx]).show();
      });
    }

    _target() {
      const sel = U.data(this.el, "target") || U.attr(this.el, "href") || U.attr(this.el, "data-target");
      if (sel && sel.startsWith("#")) return U.qs(sel);
      const controls = this.el.getAttribute("aria-controls");
      if (controls) return U.qs("#" + controls);
      return null;
    }

    show() {
      const list = U.closest(this.el, ".nav, [role='tablist']");
      const pane = this._target();
      if (!list || !pane) return;

      const tabs = U.qsa("[data-bs-toggle='tab'],[data-ux-toggle='tab'],[role='tab']", list);
      tabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
        t.setAttribute("tabindex", "-1");
      });

      this.el.classList.add("active");
      this.el.setAttribute("aria-selected", "true");
      this.el.setAttribute("tabindex", "0");

      const container = U.closest(pane, ".tab-content") || pane.parentElement;
      const panes = container ? U.qsa(".tab-pane", container) : [];
      panes.forEach(p => p.classList.remove("active", "show"));

      pane.classList.add("active", "show");
      U.dispatch(this.el, "ux4g.tab.shown", { relatedTarget: pane });
    }

    static getOrCreate(el) {
      let inst = getI(el, "tab");
      if (!inst) { inst = new Tab(el); setI(el, "tab", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Scrollspy
  // -----------------------------
  class ScrollSpy {
    constructor(el) {
      this.el = el; // element with data-bs-spy="scroll"
      this.targetSel = U.data(el, "target");
      this.offset = U.num(U.data(el, "offset", 10), 10);
      this._links = [];
      this._sections = [];

      this.refresh();
      this._bind();
    }

    refresh() {
      const nav = this.targetSel ? U.qs(this.targetSel) : null;
      if (!nav) return;

      this._links = U.qsa('a[href^="#"]', nav)
        .filter(a => a.getAttribute("href").length > 1);

      this._sections = this._links
        .map(a => U.qs(a.getAttribute("href")))
        .filter(Boolean);
    }

    _activate(id) {
      const nav = this.targetSel ? U.qs(this.targetSel) : null;
      if (!nav) return;

      this._links.forEach(a => a.classList.remove("active"));
      const link = this._links.find(a => a.getAttribute("href") === "#" + id);
      if (link) link.classList.add("active");
    }

    _bind() {
      // If the spy is on body, use window; else use that element
      const container = (this.el === document.body || this.el === document.documentElement) ? window : this.el;

      if ("IntersectionObserver" in window) {
        const root = (container === window) ? null : this.el;

        const io = new IntersectionObserver((entries) => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          if (visible?.target?.id) this._activate(visible.target.id);
        }, {
          root,
          rootMargin: `-${this.offset}px 0px -60% 0px`,
          threshold: [0.1, 0.25, 0.5, 0.75]
        });

        this._sections.forEach(s => io.observe(s));
        this._io = io;
        return;
      }

      this._onScroll = () => {
        const scrollTop = (container === window) ? window.pageYOffset : this.el.scrollTop;
        let active = null;

        for (const s of this._sections) {
          const top = s.getBoundingClientRect().top + window.pageYOffset;
          if (scrollTop + this.offset >= top) active = s;
        }
        if (active?.id) this._activate(active.id);
      };

      U.on(container, "scroll", this._onScroll, { passive: true });
      this._onScroll();
    }

    static getOrCreate(el) {
      let inst = getI(el, "scrollspy");
      if (!inst) { inst = new ScrollSpy(el); setI(el, "scrollspy", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Table
  // -----------------------------
  class Table {
    constructor(el) {
      this.el = el;
      this._bindSort();
      this._bindResize();
      this._bindSelection();
      this._bindFilter();
    }

    _bindFilter() {
      const filterBtns = U.qsa(".ux4g-table-filter-icon", this.el);
      filterBtns.forEach(btn => {
        U.on(btn, "click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetTh = U.closest(btn, "th");
          if (targetTh) {
            // Close other filters first if needed or just toggle this one
            targetTh.classList.toggle("ux4g-is-filtering");
            if (targetTh.classList.contains("ux4g-is-filtering")) {
              const input = U.qs(".ux4g-search-input", targetTh);
              if (input) input.focus();
            }
          }
        });
      });

      const closeBtns = U.qsa(".ux4g-search-clear", this.el);
      closeBtns.forEach(btn => {
        U.on(btn, "click", (e) => {
          // Only close if it's within a table filter
          const th = U.closest(btn, "th.ux4g-is-filtering");
          if (th) {
            e.preventDefault();
            e.stopPropagation();
            th.classList.remove("ux4g-is-filtering");
            const input = U.qs(".ux4g-search-input", th);
            if (input) {
               input.value = '';
               const container = U.closest(input, '.ux4g-search-container');
               if (container) container.classList.remove('ux4g-has-value');
            }
          }
        });
      });

      const inputs = U.qsa("th .ux4g-search-input", this.el);
      inputs.forEach(input => {
        U.on(input, "input", (e) => {
           const container = U.closest(input, '.ux4g-search-container');
           if (container) {
              if (input.value.length > 0) {
                 container.classList.add('ux4g-has-value');
              } else {
                 container.classList.remove('ux4g-has-value');
              }
           }
        });
      });
    }

    _bindSort() {
      const sortableCols = U.qsa(".ux4g-table-sortable th[data-sort]", this.el);
      sortableCols.forEach(th => {
        if (!U.qs(".ux4g-table-sort-icon", th)) {
          const content = U.qs(".ux4g-table-th-content", th) || th;
          const icon = document.createElement("i");
          icon.className = "ux4g-icon ux4g-table-sort-icon";
          icon.innerHTML = "arrow_downward";
          content.appendChild(icon);
        }

        U.on(th, "click", (e) => {
          // If the click happened on a filter button or something else interactive, ignore sort
          if (U.closest(e.target, ".ux4g-table-filter-icon") || U.closest(e.target, ".ux4g-search-input") || U.closest(e.target, ".ux4g-search-clear")) {
             return;
          }

          const currentSort = U.attr(th, "data-sort", "none");
          // Cycle: none -> asc -> desc -> asc... (skip none once sorted to avoid double clicks)
          const nextSort = currentSort === "asc" ? "desc" : "asc";
          
          // Reset other columns in the same table
          sortableCols.forEach(otherTh => {
            if (otherTh !== th) otherTh.setAttribute("data-sort", "none");
          });

          th.setAttribute("data-sort", nextSort);
          
          // Row sorting logic
          if (nextSort !== "none") {
             const tbody = U.qs("tbody", this.el);
             if (tbody) {
                const trs = Array.from(tbody.querySelectorAll("tr"));
                const thIndex = Array.from(th.parentNode.children).indexOf(th);
                
                trs.sort((a, b) => {
                   const aCol = a.children[thIndex];
                   const bCol = b.children[thIndex];
                   if (!aCol || !bCol) return 0;
                   
                   const aText = (aCol.textContent || aCol.innerText).trim();
                   const bText = (bCol.textContent || bCol.innerText).trim();
                   
                   const cleanV1 = aText.replace(/[₹$,\s]/g, "");
                   const cleanV2 = bText.replace(/[₹$,\s]/g, "");
                   const num1 = Number(cleanV1);
                   const num2 = Number(cleanV2);
                   
                   const isNum = !isNaN(num1) && !isNaN(num2) && cleanV1 !== "" && cleanV2 !== "";
                   
                   if (isNum) {
                      return nextSort === "asc" ? (num1 - num2) : (num2 - num1);
                   } else {
                      const comp = aText.localeCompare(bText, undefined, { numeric: true, sensitivity: 'base' });
                      return nextSort === "asc" ? comp : -comp;
                   }
                });
                
                trs.forEach(tr => tbody.appendChild(tr));
             }
          }

          U.dispatch(this.el, "ux4g.table.sort", { column: th, direction: nextSort });
        });
      });
    }

    _bindResize() {
      // Check if this table instance has resize enabled
      if (!this.el.classList.contains("ux4g-table-resizable")) return;
      const resizableCols = U.qsa("th", this.el);

      resizableCols.forEach(th => {
        // Skip last child to avoid out-of-bounds drag or provide a cleaner UX edge
        if (th === th.parentNode.lastElementChild) return;

        const handle = document.createElement("div");
        handle.className = "ux4g-table-resize-handle";
        th.appendChild(handle);

        let startX, startWidth;
        const onMouseMove = (e) => {
          const newWidth = Math.max(40, startWidth + (e.clientX - startX));
          th.style.width = `${newWidth}px`;
          th.style.minWidth = `${newWidth}px`;
        };

        const onMouseUp = () => {
          handle.classList.remove("is-resizing");
          handle.classList.remove("ux4g-is-resizing");
          U.off(document, "mousemove", onMouseMove);
          U.off(document, "mouseup", onMouseUp);
          U.dispatch(this.el, "ux4g.table.resize", { column: th, width: th.offsetWidth });
        };

        U.on(handle, "mousedown", (e) => {
          e.preventDefault();
          e.stopPropagation();
          startX = e.clientX;
          startWidth = th.offsetWidth || th.getBoundingClientRect().width;
          handle.classList.add("ux4g-is-resizing");
          U.on(document, "mousemove", onMouseMove);
          U.on(document, "mouseup", onMouseUp);
        });
      });
    }

    _bindSelection() {
      // Find a select-all checkbox in the head
      const selectAll = U.qs("thead .ux4g-checkbox", this.el);
      if (!selectAll) return;

      const rowCheckboxes = U.qsa("tbody .ux4g-checkbox", this.el);
      if (!rowCheckboxes.length) return;
      
      const updateState = () => {
        let checkedCount = 0;
        rowCheckboxes.forEach(cb => {
          const tr = U.closest(cb, "tr");
          if (cb.checked) {
            checkedCount++;
            if (tr) tr.classList.add("ux4g-is-selected");
          } else {
            if (tr) tr.classList.remove("ux4g-is-selected");
          }
        });

        if (checkedCount === 0) {
          selectAll.checked = false;
          selectAll.indeterminate = false;
        } else if (checkedCount === rowCheckboxes.length) {
          selectAll.checked = true;
          selectAll.indeterminate = false;
        } else {
          selectAll.checked = false;
          selectAll.indeterminate = true;
        }
      };

      // Listen to select-all
      U.on(selectAll, "change", (e) => {
        const isChecked = e.target.checked;
        rowCheckboxes.forEach(cb => {
          cb.checked = isChecked;
        });
        updateState();
      });

      // Listen to individual row checkboxes
      rowCheckboxes.forEach(cb => {
        U.on(cb, "change", updateState);
        
        // Also allow row click to toggle checkbox, skipping if clicking on interactable elements
        const tr = U.closest(cb, "tr");
        if (tr && tr.classList.contains("ux4g-table-interactive")) {
          U.on(tr, "click", (e) => {
            if (e.target.tagName !== "INPUT" && e.target.tagName !== "BUTTON" && !U.closest(e.target, "button") && !U.closest(e.target, "a")) {
               cb.checked = !cb.checked;
               updateState();
            }
          });
        }
      });

      // Initialize state on load
      updateState();
    }

    static getOrCreate(el) {
      let inst = getI(el, "table");
      if (!inst) { inst = new Table(el); setI(el, "table", inst); }
      return inst;
    }
  }

  // -----------------------------
  // List
  // -----------------------------
  class List {
    constructor(el) {
      this.el = el;
      this._bind();
    }

    _bind() {
      U.on(this.el, "click", (e) => {
        const item = U.closest(e.target, ".ux4g-list-item-row") || U.closest(e.target, ".ux4g-list-select-item");
        if (!item || item.disabled) return;

        const isMulti = (this.el.id === "ux4g-multiselect-list") || 
                        this.el.classList.contains("ux4g-multiselect") || 
                        this.el.classList.contains("ux4g-list-multiselect");
        const checkbox = U.qs('input[type="checkbox"]', item);
        const radio = U.qs('input[type="radio"]', item);
        const switchInput = U.qs('.ux4g-switch-input', item);

        // If clicking on input directly, don't double toggle
        if (e.target.tagName === 'INPUT') {
          const inputChecked = e.target.checked;
          
          if (!isMulti) {
            const allItems = U.qsa(".ux4g-list-item-row, .ux4g-list-select-item", this.el);
            allItems.forEach(i => {
              if (i !== item) i.classList.remove("active");
              // Also ensure other inputs are unchecked
              if (i !== item) {
                const otherInp = U.qs('input', i);
                if (otherInp) otherInp.checked = false;
              }
            });
            item.classList.toggle("active", inputChecked);
          } else {
            item.classList.toggle("active", inputChecked);
          }
          return;
        }

        if (isMulti) {
          const isActive = item.classList.toggle("active");
          if (checkbox) {
            checkbox.checked = isActive;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
          }
          if (switchInput) {
            switchInput.checked = isActive;
            switchInput.dispatchEvent(new Event("change", { bubbles: true }));
          }
        } else {
          // Single selection
          const wasActive = item.classList.contains("active");
          const allItems = U.qsa(".ux4g-list-item-row, .ux4g-list-select-item", this.el);
          
          // Clear all first
          allItems.forEach(i => {
            i.classList.remove("active");
            const cb = U.qs('input[type="checkbox"]', i);
            const rb = U.qs('input[type="radio"]', i);
            const sw = U.qs('.ux4g-switch-input', i);
            if (cb) cb.checked = false;
            if (rb) rb.checked = false;
            if (sw) sw.checked = false;
          });

          // Toggle: only add if it wasn't already active
          if (!wasActive) {
            item.classList.add("active");
            if (checkbox) {
              checkbox.checked = true;
              checkbox.dispatchEvent(new Event("change", { bubbles: true }));
            }
            if (radio) {
              radio.checked = true;
              radio.dispatchEvent(new Event("change", { bubbles: true }));
            }
            if (switchInput) {
              switchInput.checked = true;
              switchInput.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }
        }
        
        U.dispatch(this.el, "ux4g.list.change", { item, active: item.classList.contains("active") });
      });
    }

    static getOrCreate(el) {
      let inst = getI(el, "list");
      if (!inst) { inst = new List(el); setI(el, "list", inst); }
      return inst;
    }
  }

  // -----------------------------
  // Upload
  // -----------------------------
  class Upload {
    constructor(el) {
      this.el = el;
      this.input = el.querySelector('[data-ux-upload-input], .ux4g-upload-input');
      this.dropzone = el.querySelector('.ux4g-upload-panel');
      this.fileList = el.querySelector('.ux4g-upload-file-list');
      this.errorMsg = el.querySelector('.ux4g-upload-error-msg');
      this.errorText = el.querySelector('.ux4g-upload-error-text');
      this.moreButton = el.querySelector('.ux4g-upload-more');
      this.heading = el.querySelector('.ux4g-upload-heading');
      this.defaultHeading = this.heading ? this.heading.textContent.trim() : '';
      this.files = [];
      this.dragDepth = 0;
      this.stateClasses = [
        'ux4g-upload-state-default',
        'ux4g-upload-state-default-vle',
        'ux4g-upload-state-selecting',
        'ux4g-upload-state-scanning',
        'ux4g-upload-state-uploaded',
        'ux4g-upload-state-uploaded-vle',
        'ux4g-upload-state-error'
      ];
      this.maxSizeMB = U.num(U.data(el, 'max-size', 5), 5);
      this.accept = (U.attr(this.input, 'accept', '') || '')
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean);
      this._bind();
      this._syncInitialState();
    }

    _bind() {
      U.on(this.el, 'click', e => {
        if (U.closest(e.target, '[data-ux-upload-trigger]')) {
          this._openPicker();
          return;
        }
        if (U.closest(e.target, '.ux4g-upload-file-remove')) {
          const item = U.closest(e.target, '.ux4g-upload-file-item');
          this._removeFile(item);
          return;
        }
        if (U.closest(e.target, '.ux4g-upload-file-retry')) {
          this._clearError();
          this._openPicker();
          return;
        }
        if (U.closest(e.target, '.ux4g-upload-more')) {
          this._openPicker();
        }
      });

      U.on(this.dropzone, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this._openPicker();
        }
      });

      U.on(this.input, 'click', () => {
        this.input.setAttribute('data-clicked', 'true');
      });

      U.on(this.input, 'change', e => this._addFiles(Array.from(e.target.files || [])));

      U.on(this.dropzone, 'dragenter', e => {
        e.preventDefault();
        this.dragDepth += 1;
        this._setState('selecting');
      });

      U.on(this.dropzone, 'dragover', e => {
        e.preventDefault();
        this._setState('selecting');
      });

      U.on(this.dropzone, 'dragleave', e => {
        e.preventDefault();
        this.dragDepth = Math.max(0, this.dragDepth - 1);
        const nextTarget = e.relatedTarget;
        if (this.dragDepth === 0 || !nextTarget || !this.dropzone.contains(nextTarget)) {
          this._clearActive();
        }
      });

      U.on(this.dropzone, 'drop', e => {
        e.preventDefault();
        this.dragDepth = 0;
        this._clearActive();
        this._addFiles(Array.from((e.dataTransfer && e.dataTransfer.files) || []));
      });
    }

    _openPicker() {
      if (!this.input) return;
      this.input.setAttribute('data-clicked', 'true');
      this.input.click();
    }

    _setState(state) {
      this.el.classList.remove('ux4g-upload-state-selecting', 'ux4g-upload-state-error');
      if (state === 'selecting') this.el.classList.add('ux4g-upload-state-selecting');
      if (state === 'error') this.el.classList.add('ux4g-upload-state-error');
      this._syncDragHeading(state === 'selecting');
    }

    _clearActive() {
      this.el.classList.remove('ux4g-upload-state-selecting');
      this._syncDragHeading(false);
    }

    _syncDragHeading(isDragging) {
      if (!this.heading) return;
      this.heading.textContent = isDragging ? 'Drop file here' : this.defaultHeading;
    }

    _showError(msg, file) {
      this.el.classList.remove('ux4g-upload-state-selecting');
      this.el.classList.add('ux4g-upload-state-error');
      this._clearErrorRows();
      this._renderErrorFile(file, msg);
      if (this.errorMsg) this.errorMsg.classList.add('ux4g-d-none');
    }

    _clearError() {
      this.el.classList.remove('ux4g-upload-state-error');
      if (this.errorMsg) this.errorMsg.classList.add('ux4g-d-none');
      if (this.errorText) this.errorText.textContent = '';
      this._clearErrorRows();
    }

    _clearErrorRows() {
      if (!this.fileList) return;
      this.fileList.querySelectorAll('.ux4g-upload-file-item-error[data-ux-upload-error-row="true"]').forEach(item => item.remove());
    }

    _validate(file) {
      const parts = file.name.split('.');
      const ext = parts.length > 1 ? `.${parts.pop().toLowerCase()}` : '';
      if (this.accept.length && !this.accept.includes(ext)) {
        return `File type not allowed: ${ext || 'unknown'}`;
      }
      if (file.size > this.maxSizeMB * 1024 * 1024) {
        return `File too large. Max size: ${this.maxSizeMB} MB`;
      }
      return null;
    }

    _addFiles(incoming) {
      let errorOccurred = false;

      incoming.forEach(file => {
        const err = this._validate(file);
        if (err) {
          errorOccurred = true;
        this._showError(err, file);
        U.dispatch(this.el, 'ux4g.upload.error', { file, reason: err });
        return;
        }

        this.files.push(file);
        this._renderFile(file);
        U.dispatch(this.el, 'ux4g.upload.added', { file });
      });

      if (!errorOccurred) this._clearError();
      this._syncHasFiles();
      this.input.value = '';
    }

    _renderFile(file) {
      if (!this.fileList) return;

      const sizeKB = file.size / 1024;
      const sizeLabel = sizeKB >= 1024
        ? `${(sizeKB / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(sizeKB))} KB`;

      const li = document.createElement('li');
      li.className = 'ux4g-upload-file-item';
      li.setAttribute('role', 'listitem');
      li.dataset.fileName = file.name;
      li.innerHTML = `
        <div class="ux4g-upload-file-row">
          <span class="ux4g-upload-file-leading" aria-hidden="true">
            <span class="ux4g-icon-outlined ux4g-upload-file-icon">token</span>
          </span>
          <span class="ux4g-upload-file-copy">
            <span class="ux4g-body-m-strong ux4g-upload-file-name">${this._escape(file.name)}</span>
            <span class="ux4g-body-s-default ux4g-upload-file-description">${sizeLabel}</span>
          </span>
          <span class="ux4g-upload-file-statusbox" aria-hidden="true">
            <span class="ux4g-icon-outlined ux4g-upload-file-status">done</span>
          </span>
          <button type="button" class="ux4g-upload-file-remove" aria-label="Remove ${this._escape(file.name)}">
            <span class="ux4g-icon-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      `;
      this.fileList.appendChild(li);
    }

    _renderErrorFile(file, reason) {
      if (!this.fileList) return;

      const label = file && file.name ? file.name : 'Document_name.pdf';
      const li = document.createElement('li');
      li.className = 'ux4g-upload-file-item ux4g-upload-file-item-error';
      li.setAttribute('role', 'listitem');
      li.dataset.uploadErrorRow = 'true';
      li.dataset.errorReason = reason || '';
      li.innerHTML = `
        <div class="ux4g-upload-file-row">
          <span class="ux4g-upload-file-leading" aria-hidden="true">
            <span class="ux4g-icon-outlined ux4g-upload-file-icon">error_outline</span>
          </span>
          <span class="ux4g-upload-file-copy">
            <span class="ux4g-body-m-strong ux4g-upload-file-name">${this._escape(label)}</span>
            <span class="ux4g-body-s-default ux4g-upload-file-description">${this._escape(reason || 'Description')}</span>
          </span>
          <button type="button" class="ux4g-upload-file-retry" aria-label="Retry upload">
            <span class="ux4g-icon-outlined" aria-hidden="true">replay</span>
            <span class="ux4g-label-l-default">Retry</span>
          </button>
        </div>
      `;
      this.fileList.appendChild(li);
    }

    _removeFile(item) {
      const name = item && item.dataset.fileName;
      this.files = this.files.filter(f => f.name !== name);
      if (item) item.remove();
      this._syncHasFiles();
      U.dispatch(this.el, 'ux4g.upload.removed', { name });
    }

    _syncHasFiles() {
      const hasSuccessfulRows = this.fileList && this.fileList.querySelector('.ux4g-upload-file-item:not(.ux4g-upload-file-item-error)');
      const hasErrorRows = this.fileList && this.fileList.querySelector('.ux4g-upload-file-item-error');
      const hasFiles = this.files.length > 0 || !!hasSuccessfulRows || !!hasErrorRows;
      if (this.fileList) this.fileList.classList.toggle('ux4g-d-none', !hasFiles);
      if (this.moreButton) this.moreButton.classList.toggle('ux4g-d-none', !(this.files.length > 0 || !!hasSuccessfulRows));
      this._deriveBaseState(hasFiles);
    }

    _syncInitialState() {
      if (this.fileList) {
        this.files = Array.from(this.fileList.querySelectorAll('.ux4g-upload-file-item:not(.ux4g-upload-file-item-error)'))
          .map(item => ({ name: item.dataset.fileName || item.textContent.trim(), size: 0 }));
      }
      if (this.el.classList.contains('ux4g-upload-state-error')) {
        if (this.errorMsg) this.errorMsg.classList.remove('ux4g-d-none');
      } else {
        this._clearError();
      }
      this._syncHasFiles();
    }

    _deriveBaseState(hasFiles) {
      const variant = U.data(this.el, 'variant', 'default');
      this.stateClasses.forEach(cls => {
        if (cls !== 'ux4g-upload-state-selecting' && cls !== 'ux4g-upload-state-error') {
          this.el.classList.remove(cls);
        }
      });

      if (this.el.classList.contains('ux4g-upload-state-error')) return;
      if (variant === 'scanning') {
        this.el.classList.add('ux4g-upload-state-scanning');
        return;
      }
      if (variant === 'default-vle') {
        this.el.classList.add(hasFiles ? 'ux4g-upload-state-uploaded-vle' : 'ux4g-upload-state-default-vle');
        return;
      }
      this.el.classList.add(hasFiles ? 'ux4g-upload-state-uploaded' : 'ux4g-upload-state-default');
    }

    _escape(str) {
      return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    static getOrCreate(el) {
      let inst = getI(el, 'upload');
      if (!inst) { inst = new Upload(el); setI(el, 'upload', inst); }
      return inst;
    }
  }

  // -----------------------------
  // OTP
  // -----------------------------
  class OtpInput {
    constructor(el) {
      this.el = el;
      this.group = U.qs('.ux4g-otp-group', el);
      this.sourceInput = U.qs('.ux4g-otp-source', el);
      this.resend = U.qs('[data-ux-otp-resend]', el);
      this.status = U.qs('[data-ux-otp-status]', el);
      this.helper = U.qs('[data-ux-otp-helper]', el);
      this.timerTargets = U.qsa('[data-ux-otp-timer]', el);
      this.state = U.data(el, 'state', 'default');
      this.count = Math.max(1, U.num(U.data(el, 'count', 0), 0) || 1);
      this.placeholder = this.sourceInput?.getAttribute('placeholder') || '-';
      this.demoErrorOnComplete = U.bool(U.data(el, 'demo-error-on-complete', 'false'), false);
      this._timerId = null;
      this._shakeTimer = null;
      this._completedByUser = false;
      this._observer = null;
      this._demoErrorTimer = null;

      this._renderInputs();
      this.inputs = U.qsa('.ux4g-otp-input', el);
      this.length = this.count;
      this._syncInputs();
      this._observeErrorState();
      this._bind();
      this._applyVisualFocus();
      this._startTimers();
    }

    _renderInputs() {
      if (!this.group) return;

      const digits = this._getDigits();
      this.group.replaceChildren();
      if (this.sourceInput) this.group.append(this.sourceInput);

      for (let index = 0; index < this.count; index += 1) {
        const slot = document.createElement('div');
        slot.className = 'ux4g-input ux4g-otp-slot';

        const input = document.createElement('input');
        input.className = 'ux4g-input-input ux4g-otp-input ux4g-body-m-default';
        input.type = 'text';
        input.setAttribute('aria-label', `Digit ${index + 1}`);

        if (digits[index]) {
          input.value = digits[index];
        } else {
          input.placeholder = this.placeholder;
        }

        this._syncInputTone(input);
        slot.append(input);
        this.group.append(slot);

        if (index < this.count - 1) {
          const separator = document.createElement('span');
          separator.className = 'ux4g-otp-separator ux4g-icon-outlined';
          separator.setAttribute('aria-hidden', 'true');
          separator.textContent = 'horizontal_rule';
          this.group.append(separator);
        }
      }
    }

    _getDigits() {
      return ((this.sourceInput?.value || '').replace(/\D/g, '').slice(0, this.count)).split('');
    }

    _bind() {
      this.inputs.forEach((input, index) => {
        U.on(input, 'focus', () => this._setFocused(index));
        U.on(input, 'click', () => this._setFocused(index));
        U.on(input, 'input', e => this._onInput(e, index));
        U.on(input, 'keydown', e => this._onKeydown(e, index));
      });
    }

    _isInteractive() {
      return this.state === 'default' || this.state === 'partial-filled' || this.state === 'all-filled';
    }

    _syncInputs() {
      this.inputs.forEach((input, index) => {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
        input.setAttribute('autocomplete', index === 0 ? 'one-time-code' : 'off');
        input.setAttribute('maxlength', '1');
        input.placeholder = input.value ? '' : this.placeholder;
        this._syncInputTone(input);

        if (!this._isInteractive()) {
          input.setAttribute('readonly', 'readonly');
          input.setAttribute('tabindex', '-1');
        }

        if (this.state === 'locked-out') {
          input.setAttribute('disabled', 'disabled');
        }
      });
    }

    _syncInputTone(input) {
      input.classList.toggle('ux4g-title-m-strong', !!input.value);
      input.classList.toggle('ux4g-body-m-default', !input.value);
    }

    _setFocused(index) {
      this.inputs.forEach((input, inputIndex) => {
        input.closest('.ux4g-otp-slot')?.classList.toggle('ux4g-otp-focus', inputIndex === index);
        input.classList.toggle('ux4g-otp-caret', inputIndex === index && !input.value);
        input.placeholder = input.value ? '' : (inputIndex === index ? '' : this.placeholder);
      });
    }

    _syncFocusClass() {
      const active = this.inputs.findIndex(input => input === document.activeElement);
      if (active >= 0) this._setFocused(active);
    }

    _clearFocused() {
      this.inputs.forEach(input => {
        input.closest('.ux4g-otp-slot')?.classList.remove('ux4g-otp-focus');
        input.classList.remove('ux4g-otp-caret');
        input.placeholder = input.value ? '' : this.placeholder;
      });
    }

    _applyVisualFocus() {
      if (this.state === 'default') {
        this._setFocused(0);
        return;
      }

      if (this.state === 'partial-filled') {
        const emptyIndex = this.inputs.findIndex(input => !input.value);
        this._setFocused(emptyIndex >= 0 ? emptyIndex : this.inputs.length - 1);
        return;
      }

      if (this.state === 'all-filled') {
        this._setFocused(this.inputs.length - 1);
        return;
      }

      this._syncFocusClass();
    }

    _onInput(e, index) {
      const input = e.target;
      const value = (input.value || '').replace(/\D/g, '').slice(-1);
      input.value = value;
      input.placeholder = value ? '' : this.placeholder;
      this._syncInputTone(input);
      this._clearDemoErrorState();

      this._syncSourceValue();

      if (!value) return;

      if (index < this.inputs.length - 1) {
        this.inputs[index + 1].focus();
      }

      this._updateStateFromValue();
    }

    _onKeydown(e, index) {
      const input = e.target;

      if (e.key === 'Backspace') {
        if (input.value) {
          input.value = '';
          input.placeholder = this.placeholder;
          this._syncInputTone(input);
          this._clearDemoErrorState();
          this._syncSourceValue();
          this._completedByUser = false;
          this._updateStateFromValue();
          return;
        }

        if (index > 0) {
          const prev = this.inputs[index - 1];
          prev.value = '';
          prev.placeholder = this.placeholder;
          this._syncInputTone(prev);
          prev.focus();
          this._clearDemoErrorState();
          this._syncSourceValue();
          this._completedByUser = false;
          this._updateStateFromValue();
        }
        return;
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        e.preventDefault();
        this.inputs[index - 1].focus();
        return;
      }

      if (e.key === 'ArrowRight' && index < this.inputs.length - 1) {
        e.preventDefault();
        this.inputs[index + 1].focus();
      }
    }

    _syncSourceValue() {
      if (!this.sourceInput) return;
      this.sourceInput.value = this.inputs.map(input => input.value).join('');
    }

    _updateStateFromValue() {
      if (!this._isInteractive()) return;
      const filled = this.inputs.filter(input => input.value).length;
      this._completedByUser = filled === this.length;
      const next = filled === 0 ? 'default' : (filled === this.length ? 'all-filled' : 'partial-filled');
      this.el.setAttribute('data-ux-state', next);
      if (this.demoErrorOnComplete && this._completedByUser) {
        this._scheduleDemoErrorState();
      }
    }

    _isErrorState() {
      return this.el.classList.contains('ux4g-otp-error') || U.data(this.el, 'state', '') === 'error';
    }

    _triggerShakeIfError() {
      if (!this.group) return;
      if (!this._completedByUser || this.inputs.some(input => !input.value) || !this._isErrorState()) return;

      this.group.classList.remove('ux4g-otp-shake');
      void this.group.offsetWidth;
      this.group.classList.add('ux4g-otp-shake');

      if (this._shakeTimer) global.clearTimeout(this._shakeTimer);
      this._shakeTimer = global.setTimeout(() => {
        this.group?.classList.remove('ux4g-otp-shake');
        this._shakeTimer = null;
      }, 400);
    }

    _observeErrorState() {
      this._observer = new MutationObserver(() => this._triggerShakeIfError());
      this._observer.observe(this.el, {
        attributes: true,
        attributeFilter: ['class', 'data-ux-state']
      });
    }

    _scheduleDemoErrorState() {
      if (this._demoErrorTimer) global.clearTimeout(this._demoErrorTimer);
      this._demoErrorTimer = global.setTimeout(() => {
        if (!this._completedByUser || this.inputs.some(input => !input.value)) return;
        this._clearFocused();
        if (document.activeElement && this.inputs.includes(document.activeElement)) {
          document.activeElement.blur();
        }
        this.el.classList.add('ux4g-otp-error');
        this.el.setAttribute('data-ux-state', 'error');
        this.el.setAttribute('aria-invalid', 'true');
        if (this.helper) {
          this.helper.outerHTML = '<span class="ux4g-otp-status" data-ux-otp-status><span class="ux4g-icon-outlined" aria-hidden="true">error</span><span>Attempt 2 of 3</span></span>';
          this.helper = null;
          this.status = U.qs('[data-ux-otp-status]', this.el);
        }
      }, 300);
    }

    _clearDemoErrorState() {
      if (!this.demoErrorOnComplete) return;
      if (this._demoErrorTimer) {
        global.clearTimeout(this._demoErrorTimer);
        this._demoErrorTimer = null;
      }
      this.el.classList.remove('ux4g-otp-error');
      this.el.setAttribute('data-ux-state', this.inputs.some(input => input.value) ? 'partial-filled' : 'default');
      this.el.removeAttribute('aria-invalid');
      if (!this.helper && this.status) {
        this.status.outerHTML = '<span class="ux4g-otp-helper" data-ux-otp-helper>Didn’t receive OTP?</span>';
        this.helper = U.qs('[data-ux-otp-helper]', this.el);
        this.status = null;
      }
    }

    _formatTime(totalSeconds) {
      const safe = Math.max(0, totalSeconds);
      const minutes = Math.floor(safe / 60);
      const seconds = safe % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    _tickTimer(node) {
      const total = U.num(node.getAttribute('data-ux-otp-seconds'), 0);
      const prefix = node.getAttribute('data-ux-otp-prefix') || '';
      node.textContent = `${prefix}${this._formatTime(total)}`;
      if (total > 0) {
        node.setAttribute('data-ux-otp-seconds', String(total - 1));
      }
    }

    _startTimers() {
      if (!this.timerTargets.length) return;
      this.timerTargets.forEach(node => this._tickTimer(node));
      this._timerId = global.setInterval(() => {
        this.timerTargets.forEach(node => this._tickTimer(node));
      }, 1000);
    }

    static getOrCreate(el) {
      let inst = getI(el, 'otp');
      if (!inst) { inst = new OtpInput(el); setI(el, 'otp', inst); }
      return inst;
    }
  }

  // -----------------------------
  // SLA Progress
  // -----------------------------
  class SlaProgress {
    constructor(el) {
      this.el = el;
      this.valueTargets = U.qsa('.ux4g-sla-linear-value', el);
      this.circleValue = U.qs('.ux4g-sla-circle-value', el);
      this.circleMeta = U.qs('.ux4g-sla-circle-meta', el);
      this.sync();
    }

    sync() {
      const progress = Math.min(100, Math.max(0, U.num(U.data(this.el, 'progress', 0), 0)));
      this.el.style.setProperty('--ux4g-sla-progress', String(progress));

      if (this.el.hasAttribute('data-ux-sla-linear')) {
        this.valueTargets.forEach(node => {
          node.textContent = `${Math.round(progress)}%`;
        });
        this.el.setAttribute('aria-valuemin', '0');
        this.el.setAttribute('aria-valuemax', '100');
        this.el.setAttribute('aria-valuenow', String(Math.round(progress)));
      }

      if (this.el.hasAttribute('data-ux-sla-circle')) {
        const days = U.data(this.el, 'days', null);
        if (days != null && this.circleValue) {
          this.circleValue.textContent = String(days);
        }
        if (this.circleMeta) {
          this.circleMeta.textContent = Number(days) === 1 ? 'day left' : 'days left';
        }
      }
    }

    static getOrCreate(el) {
      let inst = getI(el, 'sla-progress');
      if (!inst) { inst = new SlaProgress(el); setI(el, 'sla-progress', inst); }
      return inst;
    }
  }

  class ProgressIndicator {
    constructor(el) {
      this.el = el;
      this.ensureStructure();
      this.labelTargets = U.qsa('[data-ux-progress-label]', el);
      this.descTargets = U.qsa('[data-ux-progress-desc]', el);
      this.endpointStart = U.qs('[data-ux-progress-start]', el);
      this.endpointEnd = U.qs('[data-ux-progress-end]', el);
      this.halfTrackTail = U.qs('.ux4g-progress-half-track-tail', el);
      this.halfRoundedProgress = U.qs('[data-ux-progress-half-svg-progress]', el);
      this.halfRoundedTrack = U.qs('[data-ux-progress-half-svg-track]', el);
      this.halfRoundedTrackCap = U.qs('[data-ux-progress-half-svg-track-cap]', el);
      this.halfSharpProgress = U.qs('[data-ux-progress-half-svg-progress-sharp]', el);
      this.halfSharpTrack = U.qs('[data-ux-progress-half-svg-track-sharp]', el);
      this.sync();
    }

    ensureStructure() {
      if (!this.el.hasAttribute('data-ux-progress-half')) return;
      if (U.qs('.ux4g-progress-half-arc', this.el)) return;

      const size = (this.el.getAttribute('data-ux-size') || 'm').toLowerCase();
      const shape = this.el.getAttribute('data-ux-shape') || 'sharp';
      const config = {
        s: { width: 80, height: 80, radius: 30, stroke: 10, roundedStroke: 8, labelClass: 'ux4g-label-l-strong', descriptionClass: 'ux4g-body-xs-default', endpoints: false },
        m: { width: 160, height: 160, radius: 70, stroke: 16, roundedStroke: 16, labelClass: 'ux4g-heading-m-strong', descriptionClass: 'ux4g-body-xs-default', endpoints: true },
        l: { width: 200, height: 200, radius: 90, stroke: 20, roundedStroke: 20, labelClass: 'ux4g-heading-m-strong', descriptionClass: 'ux4g-body-xs-default', endpoints: true },
        xl: { width: 240, height: 240, radius: 105, stroke: 24, roundedStroke: 24, labelClass: 'ux4g-heading-xl-strong', descriptionClass: 'ux4g-body-s-default', endpoints: true }
      }[size] || { width: 160, height: 160, radius: 70, stroke: 16, roundedStroke: 16, labelClass: 'ux4g-heading-m-strong', descriptionClass: 'ux4g-body-xs-default', endpoints: true };

      if (!this.el.hasAttribute('data-ux-radius')) {
        this.el.setAttribute('data-ux-radius', String(config.radius));
      }

      const description = this.el.getAttribute('data-ux-description') || 'Description';
      const start = this.el.getAttribute('data-ux-start-label') || '0%';
      const end = this.el.getAttribute('data-ux-end-label') || '100%';

      const roundedArcMarkup = `
        <svg class="ux4g-progress-half-svg" viewBox="0 0 ${config.width} ${config.height}" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="ux4g-progress-half-gradient-${size}" x1="0" y1="${config.height / 2}" x2="${config.width}" y2="${config.height / 2}" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--ux4g-progress-fill-start)" />
              <stop offset="100%" stop-color="var(--ux4g-progress-fill-end)" />
            </linearGradient>
          </defs>
          <path class="ux4g-progress-half-svg-track" d="${progressHalfRoundedArcPath(config.width, config.roundedStroke)}" data-ux-progress-half-svg-track></path>
          <path class="ux4g-progress-half-svg-progress" d="${progressHalfRoundedArcPath(config.width, config.roundedStroke)}" pathLength="100" data-ux-progress-half-svg-progress></path>
          <circle class="ux4g-progress-half-svg-track-cap" cx="${config.width - (config.roundedStroke / 2)}" cy="${config.height / 2}" r="${config.roundedStroke / 2}" data-ux-progress-half-svg-track-cap></circle>
        </svg>`;
      const sharpArcMarkup = `
        <svg class="ux4g-progress-half-svg ux4g-progress-half-svg-sharp" viewBox="0 0 ${config.width} ${config.height}" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="ux4g-progress-half-gradient-sharp-${size}" x1="0" y1="${config.height / 2}" x2="${config.width}" y2="${config.height / 2}" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--ux4g-progress-fill-start)" />
              <stop offset="100%" stop-color="var(--ux4g-progress-fill-end)" />
            </linearGradient>
          </defs>
          <path class="ux4g-progress-half-svg-track ux4g-progress-half-svg-track-sharp" d="${progressHalfRoundedArcPath(config.width, config.stroke)}" data-ux-progress-half-svg-track-sharp></path>
          <path class="ux4g-progress-half-svg-progress ux4g-progress-half-svg-progress-sharp" d="${progressHalfRoundedArcPath(config.width, config.stroke)}" data-ux-progress-half-svg-progress-sharp></path>
        </svg>`;
      const arcMarkup = shape === 'rounded' ? roundedArcMarkup : sharpArcMarkup;

      this.el.innerHTML = `<div class="ux4g-progress-half-arc" aria-hidden="true">${arcMarkup}</div><div class="ux4g-progress-half-copy"><span class="${config.labelClass}" data-ux-progress-label>50%</span><p class="ux4g-progress-half-description ${config.descriptionClass}" data-ux-progress-desc>${description}</p></div>${config.endpoints ? `<div class="ux4g-progress-half-endpoints"><span class="ux4g-body-xs-default" data-ux-progress-start>${start}</span><span class="ux4g-body-xs-default" data-ux-progress-end>${end}</span></div>` : ''}`;
    }

    sync() {
      const progress = Math.min(100, Math.max(0, U.num(U.data(this.el, 'progress', 0), 0)));
      this.el.style.setProperty('--ux4g-progress-value', String(progress));

      this.labelTargets.forEach(node => {
        node.textContent = `${Math.round(progress)}%`;
      });

      if (this.el.hasAttribute('data-ux-progress-half')) {
        const radius = U.num(U.data(this.el, 'radius', 0), 0);
        this.el.style.setProperty('--ux4g-progress-half-angle', `${progress * 1.8}deg`);
        if (this.halfRoundedProgress) {
          const size = this.halfRoundedProgress.ownerSVGElement.viewBox.baseVal.width;
          const stroke = U.num(getComputedStyle(this.el).getPropertyValue('--ux4g-progress-half-stroke').replace('px', ''), 0);
          this.halfRoundedProgress.setAttribute('d', progressHalfRoundedArcPath(size, stroke, 180, 180 + (progress * 1.8)));
          this.halfRoundedProgress.style.strokeDasharray = '';
          if (this.halfRoundedTrack) {
            if (progress >= 100) {
              this.halfRoundedTrack.setAttribute('d', '');
            } else {
              const trackStartAngle = progress <= 0 ? 180 : 180 + (progress * 1.8);
              this.halfRoundedTrack.setAttribute('d', progressHalfRoundedArcPath(size, stroke, trackStartAngle, 360));
            }
          }
          if (this.halfRoundedTrackCap) {
            this.halfRoundedTrackCap.style.display = progress < 100 ? 'block' : 'none';
          }
        }
        if (this.halfSharpProgress) {
          const size = this.halfSharpProgress.ownerSVGElement.viewBox.baseVal.width;
          const stroke = U.num(getComputedStyle(this.el).getPropertyValue('--ux4g-progress-half-stroke').replace('px', ''), 0);
          this.halfSharpProgress.setAttribute('d', progressHalfRoundedArcPath(size, stroke, 180, 180 + (progress * 1.8)));
          if (this.halfSharpTrack) {
            if (progress >= 100) {
              this.halfSharpTrack.setAttribute('d', '');
            } else {
              const trackStartAngle = progress <= 0 ? 180 : 180 + (progress * 1.8);
              this.halfSharpTrack.setAttribute('d', progressHalfRoundedArcPath(size, stroke, trackStartAngle, 360));
            }
          }
        }
        if (this.halfTrackTail) {
          this.halfTrackTail.hidden = true;
        }
      }

      const description = this.el.getAttribute('data-ux-description');
      if (description) {
        this.descTargets.forEach(node => {
          node.textContent = description;
        });
      }

      const start = this.el.getAttribute('data-ux-start-label');
      const end = this.el.getAttribute('data-ux-end-label');
      if (this.endpointStart && start != null) this.endpointStart.textContent = start;
      if (this.endpointEnd && end != null) this.endpointEnd.textContent = end;

      this.el.setAttribute('aria-valuemin', '0');
      this.el.setAttribute('aria-valuemax', '100');
      this.el.setAttribute('aria-valuenow', String(Math.round(progress)));
    }

    static getOrCreate(el) {
      let inst = getI(el, 'progress-indicator');
      if (!inst) { inst = new ProgressIndicator(el); setI(el, 'progress-indicator', inst); }
      return inst;
    }
  }

  function progressCircleLabelClass(size, placement) {
    if (placement === 'outside') return 'ux4g-label-xl-strong';
    if (size === 'xs' || size === 's' || size === 'm') return 'ux4g-label-m-strong';
    if (size === 'l') return 'ux4g-label-l-strong';
    return 'ux4g-label-xl-strong';
  }

  function progressCircleDescriptionClass(size, placement) {
    if (placement === 'outside') return 'ux4g-body-s-default';
    return (size === 'xl' || size === '2xl' || size === '3xl') ? 'ux4g-body-s-default' : 'ux4g-body-xs-default';
  }

  function progressHalfLabelClass(size) {
    return size === 's' ? 'ux4g-label-l-strong' : 'ux4g-heading-m-strong';
  }

  function progressHalfRoundedArcPath(size, stroke, startAngle = 180, endAngle = 360) {
    const radius = (size / 2) - (stroke / 2);
    const center = size / 2;
    const start = polarPoint(center, radius, startAngle);
    const end = polarPoint(center, radius, endAngle);
    const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  }

  function polarPoint(center, radius, angleDeg) {
    const angle = (angleDeg * Math.PI) / 180;
    return {
      x: center + (radius * Math.cos(angle)),
      y: center + (radius * Math.sin(angle))
    };
  }

  function buildProgressBarDemo(shape, placement, progress) {
    const inside = placement === 'inside';
    return `<article class="ux4g-progress-bar" data-ux-progress-bar data-ux-shape="${shape}" data-ux-label-placement="${placement}" data-ux-progress="${progress}" role="progressbar" aria-label="${shape} ${placement} bar ${progress} percent"><div class="ux4g-progress-bar-track"><div class="ux4g-progress-bar-fill">${inside ? `<span class="ux4g-progress-bar-label ux4g-progress-bar-label-inside ux4g-label-s-strong" data-ux-progress-label>${progress}%</span>` : ''}</div></div>${inside ? '' : `<span class="ux4g-progress-bar-label ux4g-progress-bar-label-outside ux4g-label-s-strong" data-ux-progress-label>${progress}%</span>`}</article>`;
  }

  function buildProgressCircleDemo(shape, size, placement) {
    const labelClass = progressCircleLabelClass(size, placement);
    const showInsideDescription = placement === 'inside' && (size === 'xl' || size === '2xl' || size === '3xl');
    const descClass = progressCircleDescriptionClass(size, placement);
    return `<div class="ux4g-progress-size-demo"><article class="ux4g-progress-circle" data-ux-progress-circle data-ux-shape="${shape}" data-ux-size="${size}" data-ux-label-placement="${placement}" data-ux-progress="50" ${(placement === 'outside' || showInsideDescription) ? 'data-ux-description="Description"' : ''} role="progressbar" aria-label="${size} ${shape} circle ${placement} 50 percent"><div class="ux4g-progress-circle-indicator"><span class="ux4g-progress-circle-ring"></span>${placement === 'inside' ? `<div class="ux4g-progress-circle-value-wrap"><span class="${labelClass}" data-ux-progress-label>50%</span>${showInsideDescription ? `<p class="ux4g-progress-circle-description ${descClass}" data-ux-progress-desc>Description</p>` : ''}</div>` : ''}</div>${placement === 'outside' ? `<div class="ux4g-progress-circle-copy"><span class="${labelClass}" data-ux-progress-label>50%</span><p class="ux4g-progress-circle-description ${descClass}" data-ux-progress-desc>Description</p></div>` : ''}</article></div>`;
  }

  function renderProgressIndicatorDemos(root = document) {
    const steps = [0, 10];
    const barContainers = [
      ['sharp-outside', 'sharp', 'outside'],
      ['rounded-outside', 'rounded', 'outside'],
      ['sharp-inside', 'sharp', 'inside'],
      ['rounded-inside', 'rounded', 'inside']
    ];
    barContainers.forEach(([key, shape, placement]) => {
      const container = root.querySelector(`[data-ux-progress-demo-bars="${key}"]`);
      if (!container) return;
      container.innerHTML = steps.map(progress => buildProgressBarDemo(shape, placement, progress)).join('');
    });

    const circleSizes = ['xs', 's', 'm', 'l', 'xl', '2xl', '3xl'];
    const circleHeadings = root.querySelector('[data-ux-progress-demo-circle-headings]');
    if (circleHeadings) circleHeadings.innerHTML = '';
    const circleRows = [
      ['sharp-inside', 'sharp', 'inside'],
      ['sharp-outside', 'sharp', 'outside'],
      ['rounded-inside', 'rounded', 'inside'],
      ['rounded-outside', 'rounded', 'outside']
    ];
    circleRows.forEach(([key, shape, placement]) => {
      const row = root.querySelector(`[data-ux-progress-demo-circles="${key}"]`);
      if (!row) return;
      row.innerHTML = circleSizes.map(size => buildProgressCircleDemo(shape, size, placement)).join('');
    });

  }

  // -----------------------------
  // Data API init
  // -----------------------------
  function init(root = document) {
    renderProgressIndicatorDemos(root);

    // Dropdown
    U.qsa('[data-bs-toggle="dropdown"],[data-ux-toggle="dropdown"]', root).forEach(Dropdown.getOrCreate);

    // Collapse
    U.qsa('[data-bs-toggle="collapse"],[data-ux-toggle="collapse"],[ux4g-toggle="collapse"]', root).forEach(Collapse.getOrCreate);

    // Tabs
    U.qsa('[data-bs-toggle="tab"],[data-ux-toggle="tab"]', root).forEach(Tab.getOrCreate);

    // Tooltips / Popovers
    U.qsa('[data-bs-toggle="tooltip"],[data-ux-toggle="tooltip"]', root).forEach(el => Floating.getOrCreate(el, "tooltip"));
    U.qsa('[data-bs-toggle="popover"],[data-ux-toggle="popover"]', root).forEach(el => Floating.getOrCreate(el, "popover"));

    // Toasts (wires dismiss; does not auto-show unless .show is already present)
    U.qsa(".toast", root).forEach(Toast.getOrCreate);

    // Carousels
    U.qsa(".carousel", root).forEach(Carousel.getOrCreate);

    // Scrollspy
    U.qsa('[data-bs-spy="scroll"],[data-ux-spy="scroll"]', root).forEach(ScrollSpy.getOrCreate);

    // Table Interactions
    U.qsa(".ux4g-table", root).forEach(Table.getOrCreate);

    // List Interactions
    U.qsa(".ux4g-list", root).forEach(List.getOrCreate);

    // Upload
    U.qsa('[data-ux-upload]', root).forEach(Upload.getOrCreate);

    // OTP
    U.qsa('[data-ux-otp]', root).forEach(OtpInput.getOrCreate);

    // SLA Progress
    U.qsa('[data-ux-sla-circle],[data-ux-sla-linear]', root).forEach(SlaProgress.getOrCreate);

    // Progress Indicators
    U.qsa('[data-ux-progress-bar],[data-ux-progress-circle],[data-ux-progress-half]', root).forEach(ProgressIndicator.getOrCreate);

    // Validation: Ensure ux4g-multiselect-list ID is only used on .ux4g-list elements
    const multiselectIdEls = root.querySelectorAll('#ux4g-multiselect-list');
    multiselectIdEls.forEach(el => {
      if (!el.classList.contains('ux4g-list')) {
        console.warn(`[UX4G Validation] The ID 'ux4g-multiselect-list' should only be used on elements with the 'ux4g-list' class. Found on:`, el);
      }
    });
  }

  // Delegated toggles for Modal & Offcanvas (+ your custom open/close classes)
  U.on(document, "click", (e) => {
    // UX4G modal toggle
    const modalBtn = U.closest(e.target, '[data-bs-toggle="modal"],[data-ux-toggle="modal"]');
    if (modalBtn) {
      e.preventDefault();
      const sel = U.data(modalBtn, "target") || U.attr(modalBtn, "href");
      const modalEl = sel && sel.startsWith("#") ? U.qs(sel) : null;
      if (modalEl) Modal.getOrCreate(modalEl).toggle(modalBtn);
      return;
    }

    // YOUR custom modal open (.open-modal) — assumes #exampleModal (your HTML)
    const openModal = U.closest(e.target, ".open-modal");
    if (openModal) {
      e.preventDefault();
      const modalEl = U.qs("#exampleModal");
      if (modalEl) Modal.getOrCreate(modalEl).show(openModal);
      return;
    }

    // UX4G offcanvas toggle
    const offBtn = U.closest(e.target, '[data-bs-toggle="offcanvas"],[data-ux-toggle="offcanvas"]');
    if (offBtn) {
      e.preventDefault();
      const sel = U.data(offBtn, "target") || U.attr(offBtn, "href");
      const el = sel && sel.startsWith("#") ? U.qs(sel) : null;
      if (el) Offcanvas.getOrCreate(el).toggle(offBtn);
      return;
    }

    // Toast close class bridge (your HTML)
    const closeToast = U.closest(e.target, ".close-toast");
    if (closeToast) {
      e.preventDefault();
      const toastEl = U.closest(closeToast, ".toast");
      if (toastEl) Toast.getOrCreate(toastEl).hide();
      return;
    }

    // Modal close class bridge (your HTML)
    const closeModal = U.closest(e.target, ".close-modal");
    if (closeModal) {
      e.preventDefault();
      const modalEl = U.closest(closeModal, ".modal");
      if (modalEl) Modal.getOrCreate(modalEl).hide();
      return;
    }
  });

  // Switch keyboard support (Enter to toggle)
  U.on(document, "keydown", (e) => {
    if (e.key === "Enter") {
      const input = U.closest(e.target, ".ux4g-switch-input");
      if (input && !input.disabled) {
        e.preventDefault();
        input.checked = !input.checked;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  });

  // Your demo: #liveToastBtn shows #liveToast
  U.on(document, "DOMContentLoaded", () => {
    const btn = U.qs("#liveToastBtn");
    if (btn) {
      U.on(btn, "click", () => {
        const toastEl = U.qs("#liveToast");
        if (toastEl) Toast.getOrCreate(toastEl).show();
      });
    }
  });

  U.on(document, "ux4g.upload.error", (e) => {
    if (typeof global.showContextAlert === "function") {
      global.showContextAlert("top-right", "error", "Upload Failed", e.detail.reason);
    }
  });

  // Auto-init
  if (document.readyState === "loading") {
    U.on(document, "DOMContentLoaded", () => init(document));
  } else {
    init(document);
  }

  // Expose API
  global.ux4g = {
    version: "1.1.0",
    U,
    getI,
    setI,
    escapeHtml,
    init,
    Dropdown,
    Collapse,
    Modal,
    Offcanvas,
    Toast,
    Carousel,
    Tab,
    ScrollSpy,
    Table,
    List,
    Upload,
    OtpInput,
    Theme: {
      get() {
        return document.documentElement.getAttribute("data-theme") || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      },
      set(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        window.dispatchEvent(new CustomEvent("ux4g.theme.changed", { detail: { theme } }));
      },
      toggle() {
        const next = this.get() === "dark" ? "light" : "dark";
        this.set(next);
      }
    }
  };

  // Auto-init theme if not set
  U.on(document, "DOMContentLoaded", () => {
    if (!document.documentElement.hasAttribute("data-theme")) {
      const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", preferred);
    }
  });

const Backdrop = (() => {
  let count = 0;

  function create() {
    const bd = document.createElement("div");
    bd.className = "modal-backdrop fade";
    document.body.appendChild(bd);
    // force reflow to enable transition
    bd.offsetHeight; // eslint-disable-line no-unused-expressions
    bd.classList.add("show");
    return bd;
  }

  function show(onClick) {
    count += 1;
    const bd = create();
    if (typeof onClick === "function") {
      bd.addEventListener("click", onClick);
    }
    return bd;
  }

  function hide(bd, duration = 250) {
    if (!bd) return;
    bd.classList.remove("show");

    // Remove after transition
    window.setTimeout(() => {
      try { bd.remove(); } catch (_) {}
    }, duration);
  }

  function dec() {
    count = Math.max(0, count - 1);
    return count;
  }

  return { show, hide, dec, get count() { return count; } };
})();


})(typeof window !== "undefined" ? window : this);


