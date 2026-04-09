/*
|   |   \   /   |   |    ____ 
|   |    \ /    |___|   |    
|   |    / \        |   |  __
|___|   /   \       |   |___|
----------------------------
       DESIGN SYSTEM

-UX4G Design System v3.0
-Copyright 2026 The UX4G Authors(Nitesh Yadav, Ershad Alam)
-Copyright 2026 NeGD, MeitY.
-Licensed under MIT.*/

/*!
 * UX4G.js
 * Components: Dropdown, Collapse/Accordion, Modal, Offcanvas, Tooltip, Popover, Toast, Carousel, Tabs, Scrollspy
 * Compatibility: UX4G markup (data-ux-*)
 * Extras: supports .open-modal/.close-modal, .close-toast, #liveToastBtn (your sample HTML)
 * Version: 3.0
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
  // Data API init
  // -----------------------------
  function init(root = document) {
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

