/* ========================================================= tooltips js ========================================================= */
(function (ux4g) {
  if (!ux4g) return;
  const U = ux4g.U;
  const getI = ux4g.getI;
  const setI = ux4g.setI;
  const escapeHtml = ux4g.escapeHtml;

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
      if (content != null) return this.html ? String(content) : escapeHtml(content);

      if (this.kind === "popover") {
        const title = U.data(this.el, "title") || this.el.getAttribute("title") || "";
        const body = this.el.getAttribute("data-content") || "";
        const t = this.html ? String(title) : escapeHtml(title);
        const b = this.html ? String(body) : escapeHtml(body);
        return `<div class="ux4g-popover-header">${t}</div><div class="ux4g-popover-body">${b}</div>`;
      }

      const t = this.el.getAttribute("title") || "";
      return this.html ? String(t) : escapeHtml(t);
    }

    _create() {
      if (this._floating) return;
      const div = document.createElement("div");
      div.className = this.kind === "tooltip" ? "ux4g-tooltip" : "ux4g-popover";
      div.setAttribute("role", this.kind === "tooltip" ? "tooltip" : "dialog");
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
      U.placeFloating(this.el, this._floating, this.placement, this.offset);

      this._onWin = () => U.placeFloating(this.el, this._floating, this.placement, this.offset);
      U.on(window, "scroll", this._onWin, { passive: true });
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

      if (this._onWin) {
        U.off(window, "scroll", this._onWin);
        U.off(window, "resize", this._onWin);
        this._onWin = null;
      }

      U.dispatch(this.el, `ux4g.${this.kind}.hidden`, {});
    }

    toggle() { this._open ? this.hide() : this.show(); }

    _bind() {
      const triggers = String(this.trigger).split(/\s+/).filter(Boolean);

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

  function repositionManualTooltip(tooltip) {
    if (!tooltip || tooltip.dataset.uxAdjusted === "true") return;

    // We need to know where it *will* be once it's fully hovered
    const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);

    const originalTransition = tooltip.style.transition;
    const originalDisplay = tooltip.style.display;
    const originalOpacity = tooltip.style.opacity;

    // Temporarily disable transition and force show to measure target state
    tooltip.style.transition = 'none';
    tooltip.style.display = 'flex';
    tooltip.style.opacity = '0';
    
    // Force reflow
    tooltip.offsetHeight; 
    
    const rect = tooltip.getBoundingClientRect();

    let shiftX = 0;
    let shiftY = 0;

    // Check boundaries with some padding
    const padding = 18; 
    if (rect.left < padding) {
      shiftX = padding - rect.left;
    } else if (rect.right > vw - padding) {
      shiftX = (vw - padding) - rect.right;
    }

    if (rect.top < padding) {
      shiftY = padding - rect.top;
    } else if (rect.bottom > vh - padding) {
      shiftY = (vh - padding) - rect.bottom;
    }

    if (shiftX !== 0 || shiftY !== 0) {
      const computedStyle = window.getComputedStyle(tooltip);
      const currentTransform = computedStyle.transform === 'none' ? '' : computedStyle.transform;
      // Apply the fix
      tooltip.style.transform = `${currentTransform} translate(${shiftX}px, ${shiftY}px)`;
      tooltip.dataset.uxAdjusted = "true";
    }

    // Restore state (but keep the transform)
    tooltip.style.display = originalDisplay;
    tooltip.style.opacity = originalOpacity;
    // Delay restoring transition slightly to avoid "flying" into place from old position
    setTimeout(() => {
      tooltip.style.transition = originalTransition;
    }, 50);
  }

  // Initialize
  document.addEventListener("DOMContentLoaded", () => {
    // Data API init
    U.qsa('[data-bs-toggle="tooltip"],[data-ux-toggle="tooltip"]').forEach(el => Floating.getOrCreate(el, "tooltip"));
    U.qsa('[data-bs-toggle="popover"],[data-ux-toggle="popover"]').forEach(el => Floating.getOrCreate(el, "popover"));

    // Auto-fix manual tooltips on hover
    document.body.addEventListener('mouseover', (e) => {
      const wrapper = e.target.closest('.ux4g-tooltip-wrapper');
      if (wrapper) {
        const tooltip = wrapper.querySelector('.ux4g-tooltip');
        if (tooltip) repositionManualTooltip(tooltip);
      }
    });

    document.body.addEventListener('mouseout', (e) => {
      const wrapper = e.target.closest('.ux4g-tooltip-wrapper');
      if (wrapper && !wrapper.contains(e.relatedTarget)) {
        const tooltip = wrapper.querySelector('.ux4g-tooltip');
        if (tooltip) {
          tooltip.style.transform = '';
          delete tooltip.dataset.uxAdjusted;
        }
      }
    });
  });

  // Assign to global
  ux4g.Tooltip = { getOrCreate(el) { return Floating.getOrCreate(el, "tooltip"); } };
  ux4g.Popover = { getOrCreate(el) { return Floating.getOrCreate(el, "popover"); } };

  /**
   * Helper to ensure menus stay within viewport
   */
  ux4g.repositionMenu = function(container, menu) {
    if (!menu) return;
    
    // Reset positions to let CSS natural flow work first for measurement
    menu.style.top = "";
    menu.style.bottom = "";
    menu.style.left = "";
    menu.style.right = "";
    
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const menuRect = menu.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Vertical Flip
    if (menuRect.bottom > vh && containerRect.top > menuRect.height) {
      menu.style.top = "auto";
      menu.style.bottom = "100%";
      const offset = getComputedStyle(menu).getPropertyValue('--ux4g-dropdown-menu-offset-y') || 
                     getComputedStyle(menu).getPropertyValue('--ux4g-combobox-menu-offset-y') || '6px';
      menu.style.marginBottom = offset;
    }

    // Horizontal Shift
    const updatedRect = menu.getBoundingClientRect();
    if (updatedRect.right > vw) {
      menu.style.left = "auto";
      menu.style.right = "0";
    }
    if (updatedRect.left < 0) {
      menu.style.left = "0";
      menu.style.right = "auto";
    }
  };

  // Update open menus on resize/scroll
  window.addEventListener('resize', () => {
    document.querySelectorAll('.ux4g-dropdown.is-open, .ux4g-combobox.is-open, .ux4g-breadcrumb-dropdown .show + .show').forEach(el => {
      let container = el;
      let menu = el.querySelector('.ux4g-dropdown-menu, .ux4g-combobox-menu, .ux4g-breadcrumb-menu');
      if (el.classList.contains('ux4g-breadcrumb-toggle')) {
         container = el.parentElement;
         menu = container.querySelector('.ux4g-breadcrumb-menu');
      }
      if (container && menu) ux4g.repositionMenu(container, menu);
    });
  });

  /**
   * Common Filter Core Logic
   */
  ux4g.filterCore = {
    /**
     * @param {string} text - The item text to check
     * @param {string} query - The search query
     * @param {string} mode - 'contains', 'starts-with', or 'starts-with-term'
     */
    matches: function (text, query, mode) {
      if (!query) return true;
      const t = String(text).toLowerCase();
      const q = String(query).toLowerCase().trim();

      switch (mode) {
        case "starts-with":
          return t.startsWith(q);
        case "starts-with-term":
          // Matches if any word in the text starts with the query
          return t.split(/\s+/).some((w) => w.startsWith(q));
        case "contains":
        default:
          return t.includes(q);
      }
    },

    /**
     * @param {string} originalText - The text to highlight
     * @param {string} query - The search query
     * @param {string} mode - 'contains', 'starts-with', or 'starts-with-term'
     */
    highlight: function (originalText, query, mode) {
      if (!query) return originalText;
      const q = query.trim();
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      let regex;
      switch (mode) {
        case "starts-with":
          regex = new RegExp(`^(${escaped})`, "i");
          break;
        case "starts-with-term":
          regex = new RegExp(`\\b(${escaped})`, "i");
          break;
        case "contains":
        default:
          regex = new RegExp(`(${escaped})`, "i");
          break;
      }

      return originalText.replace(regex, "<strong>$1</strong>");
    }
  };

})(window.ux4g);

/* ========================================================= breadcrumb js ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const dropdowns = document.querySelectorAll(".ux4g-breadcrumb-dropdown");
  if (!dropdowns.length) return;

  const closeDropdown = (dropdown) => {
    const toggle = dropdown.querySelector(".ux4g-breadcrumb-toggle");
    const menu = dropdown.querySelector(".ux4g-breadcrumb-menu");

    if (!toggle || !menu) return;

    toggle.classList.remove("show");
    menu.classList.remove("show");
    toggle.setAttribute("aria-expanded", "false");
  };

  const openDropdown = (dropdown) => {
    const toggle = dropdown.querySelector(".ux4g-breadcrumb-toggle");
    const menu = dropdown.querySelector(".ux4g-breadcrumb-menu");

    if (!toggle || !menu) return;

    toggle.classList.add("show");
    menu.classList.add("show");
    toggle.setAttribute("aria-expanded", "true");    
    if (window.ux4g && window.ux4g.repositionMenu) {
      window.ux4g.repositionMenu(dropdown, menu);
    }
  };

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(".ux4g-breadcrumb-toggle");
    const menu = dropdown.querySelector(".ux4g-breadcrumb-menu");

    if (!toggle || !menu) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const isOpen = menu.classList.contains("show");

      dropdowns.forEach((d) => closeDropdown(d));

      if (!isOpen) openDropdown(dropdown);
    });

    menu.addEventListener("click", () => closeDropdown(dropdown));
  });

  document.addEventListener("click", () => {
    dropdowns.forEach((d) => closeDropdown(d));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") dropdowns.forEach((d) => closeDropdown(d));
  });
});



/* ========================================================= list js ========================================================= */

// Draggable js

document.addEventListener("DOMContentLoaded", () => {

  const list = document.querySelector(".ux4g-list-draggable");
  let draggedItem = null;

  // enable drag only from icon
  document.querySelectorAll(".ux4g-icon-outlined, .ux4g-icon").forEach(icon => {

    icon.addEventListener("dragstart", (e) => {
      draggedItem = icon.closest(".ux4g-list-item");
      draggedItem.classList.add("dragging");

      e.dataTransfer.effectAllowed = "move";
    });

  });

  document.querySelectorAll(".ux4g-list-item").forEach(item => {

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      const dragging = document.querySelector(".dragging");

      if (dragging === item) return;

      const rect = item.getBoundingClientRect();
      const offset = e.clientY - rect.top;

      if (offset > rect.height / 2) {
        item.after(dragging);
      } else {
        item.before(dragging);
      }
    });

    item.addEventListener("dragend", () => {
      draggedItem.classList.remove("dragging");
      draggedItem = null;
    });

  });

});

/* ========================================================= Modal js ========================================================= */

document.addEventListener('DOMContentLoaded', () => {

  const openModalButtons = document.querySelectorAll('[data-modal-target]');

  openModalButtons.forEach(button => {
    button.addEventListener('click', () => {
      const targetSelector = button.getAttribute('data-modal-target');
      const targetModal = document.querySelector(targetSelector);

      if (targetModal) {
        targetModal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
      }
    });
  });

  const closeModalButtons = document.querySelectorAll('[data-close-modal]');

  closeModalButtons.forEach(button => {
    button.addEventListener('click', (event) => {
      const modal = event.target.closest('.ux4g-modal-backdrop');
      if (modal) {
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
      }
    });
  });

  window.addEventListener('click', (event) => {
    if (event.target.classList.contains('ux4g-modal-backdrop')) {
      event.target.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const openModals = document.querySelectorAll('.ux4g-modal-backdrop.is-open');
      openModals.forEach(modal => {
        modal.classList.remove('is-open');
      });
      document.body.style.overflow = '';
    }
  });
});

/* ========================================================= clear seach btn js ========================================================= */

//     if (!input || !clearBtn) return;

//     input.addEventListener("input", () => {
//       clearBtn.classList.toggle("ux4g-show-clear", input.value.trim() !== "");
//     });

//     clearBtn.addEventListener("click", () => {
//       input.value = "";
//       clearBtn.classList.remove("ux4g-show-clear");
//       input.focus();
//     });
//   });
// });

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".ux4g-search-container").forEach((searchWrap) => {
    const input = searchWrap.querySelector(".ux4g-search-input");
    const clearBtn = searchWrap.querySelector(".ux4g-search-clear");
    const list = searchWrap.querySelector(".ux4g-search-list");
    const filterMode = searchWrap.getAttribute("ux4g-search-filter") || "contains";

    if (!input) return;

    const toggleSearchState = () => {
      searchWrap.classList.toggle("ux4g-has-value", input.value.trim() !== "");
      handleSearchFilter();
    };

    const handleSearchFilter = () => {
      if (!list) return;

      // Only show list if there's a value, the component is active (focused),
      // or it's forced by 'show-empty' class
      const isActive = searchWrap.classList.contains("ux4g-is-active");
      const hasValue = input.value.trim() !== "";
      const showEmpty = searchWrap.classList.contains("ux4g-search-show-empty");

      if (isActive || hasValue || showEmpty) {
        list.style.display = "block";
      } else {
        list.style.display = "none";
      }

      const value = input.value;
      const options = list.querySelectorAll(".ux4g-list-item");
      const isSearchable = input.id && input.id.trim() !== "";
      let visibleCount = 0;

      options.forEach(option => {
        // Store original text
        const labelNode = option.querySelector(".ux4g-list-item-start");
        if (labelNode) {
          labelNode.style.gap = "0"; // Remove gap that causes space between highlight and text
        }
        const originalText = option.dataset.originalText || (labelNode ? labelNode.textContent.trim() : option.textContent.trim());
        if (!option.dataset.originalText) option.dataset.originalText = originalText;

        const isMatch = isSearchable ? window.ux4g.filterCore.matches(originalText, value, filterMode) : true;
        option.style.display = isMatch ? "" : "none";

        if (labelNode) {
          const trimmedQuery = value.trim();
          if (isSearchable && trimmedQuery && isMatch) {
            labelNode.innerHTML = window.ux4g.filterCore.highlight(originalText, trimmedQuery, filterMode);
          } else {
            labelNode.textContent = originalText;
          }
        }
        if (isMatch) visibleCount++;
      });
      
      // Toggle No Results Message
      let noResults = list.querySelector(".ux4g-search-no-results");
      if (visibleCount === 0 && value.trim() !== "") {
        if (!noResults) {
          noResults = document.createElement("li");
          noResults.className = "ux4g-search-no-results ux4g-p-s ux4g-text-center ux4g-text-muted";
          noResults.style.listStyle = "none";
          noResults.textContent = "No results found";
          list.appendChild(noResults);
        }
        noResults.style.display = "";
      } else if (noResults) {
        noResults.style.display = "none";
      }

      // Optionally show list only when there's a value or interaction
      list.style.display = (value.trim() === "" && visibleCount === 0 && !searchWrap.classList.contains("ux4g-search-show-empty")) ? "none" : "";
      
      // If list is hidden, don't show no results either
      if (list.style.display === "none" && noResults) noResults.style.display = "none";
    };

    input.addEventListener("input", toggleSearchState);

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        input.value = "";
        toggleSearchState();
        input.focus();
      });
    }

    input.addEventListener("focus", () => {
      searchWrap.classList.add("ux4g-is-active");
      handleSearchFilter();
    });

    input.addEventListener("blur", (e) => {
      // Small timeout to allow potential clicks on the list item itself
      setTimeout(() => {
        if (!searchWrap.contains(document.activeElement)) {
          searchWrap.classList.remove("ux4g-is-active");
          handleSearchFilter();
        }
      }, 200);
    });

    // Close when clicking outside
    document.addEventListener("mousedown", (e) => {
      if (!searchWrap.contains(e.target)) {
        searchWrap.classList.remove("ux4g-is-active");
        handleSearchFilter();
      }
    });

    // Initial state
    toggleSearchState();
  });
});

// clear input text
document.addEventListener("DOMContentLoaded", () => {
  const toggle = (i) => i.closest(".ux4g-input-container")?.classList.toggle("ux4g-has-value", i.value.length > 0);

  document.addEventListener("input", (e) => e.target.tagName === "INPUT" && toggle(e.target));

  document.addEventListener("click", (e) => {
    const btn = e.target.closest('[aria-label="Clear input"], .ux4g-input-clear');
    if (btn) {
      const input = btn.closest(".ux4g-input-container")?.querySelector("input");
      if (input && !input.disabled && !input.readOnly) {
        input.value = "";
        toggle(input);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.focus();
      }
    }
  });

  document.querySelectorAll(".ux4g-input-container input").forEach(toggle);
});

/* ========================================================= textarea counter js ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  const updateCounter = (textarea) => {
    const wrapper = textarea.closest(".ux4g-textarea");
    if (!wrapper) return;

    const counter = wrapper.querySelector(".ux4g-textarea-counter");
    if (!counter) return;

    const maxLength = textarea.getAttribute("maxlength") || 0;
    const currentLength = textarea.value.length;

    // Update text content with standard "0 / 200" format 
    // Uses textContent to avoid XSS vectors or accidental HTML
    counter.textContent = `${currentLength} / ${maxLength}`;
  };

  // Add listener for all input events globally (event delegation)
  document.addEventListener("input", (e) => {
    if (e.target && e.target.matches && e.target.matches(".ux4g-textarea-input")) {
      updateCounter(e.target);
    }
  });

  // Initialize all textareas with counters on page load
  document.querySelectorAll(".ux4g-textarea-input").forEach((textarea) => {
    updateCounter(textarea);
  });
});



// // ux4g drawer js

document.addEventListener("DOMContentLoaded", () => {

  const buttons = document.querySelectorAll("[data-drawer]");


  /* ---------------- */
  /* CLOSE DRAWER FUNCTION */
  /* ---------------- */

  function closeDrawer() {

    const openDrawer = document.querySelector(".ux4g-drawer.ux4g-drawer-open");
    const openOverlay = document.querySelector(".ux4g-drawer-overlay.ux4g-drawer-open");

    if (!openDrawer || !openOverlay) return;

    openDrawer.classList.remove("ux4g-drawer-open");
    openOverlay.classList.remove("ux4g-drawer-open");

    document.body.classList.remove("ux4g-drawer-lock");
  }



  /* ---------------- */
  /* OPEN DRAWER */
  /* ---------------- */

  buttons.forEach(button => {

    button.addEventListener("click", () => {

      const drawer = document.getElementById(button.dataset.drawer);
      const overlay = drawer.closest(".ux4g-drawer-overlay");

      document.querySelectorAll(".ux4g-drawer-open")
        .forEach(el => el.classList.remove("ux4g-drawer-open"));

      overlay.classList.add("ux4g-drawer-open");
      drawer.classList.add("ux4g-drawer-open");

      document.body.classList.add("ux4g-drawer-lock");

    });

  });



  /* ---------------- */
  /* CLOSE VIA BUTTONS */
  /* ---------------- */

  document.addEventListener("click", (e) => {

    const closeTrigger = e.target.closest("[data-drawer-close]");

    if (closeTrigger) {
      closeDrawer();
      return;
    }


    /* CLOSE VIA OVERLAY CLICK */

    const overlay = e.target.closest(".ux4g-drawer-overlay");

    if (overlay && !e.target.closest(".ux4g-drawer")) {
      closeDrawer();
    }

  });



  /* ---------------- */
  /* CLOSE VIA ESC KEY */
  /* ---------------- */

  document.addEventListener("keydown", (e) => {

    if (e.key === "Escape") {
      closeDrawer();
    }

  });

});

/* ========================================================= dropdown js ========================================================= */

/* ========================================================= dropdown js ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const dropdowns = Array.from(document.querySelectorAll(".ux4g-dropdown"));
  if (!dropdowns.length) return;

  const closeDropdown = (dropdown) => {
    dropdown.classList.remove("is-open");
    const control = dropdown.querySelector(".ux4g-dropdown-control");
    if (control) control.setAttribute("aria-expanded", "false");
  };

  const openDropdown = (dropdown) => {
    dropdowns.forEach((item) => {
      if (item !== dropdown) closeDropdown(item);
    });
    dropdown.classList.add("is-open");
    const control = dropdown.querySelector(".ux4g-dropdown-control");
    if (control) control.setAttribute("aria-expanded", "true");

    const menu = dropdown.querySelector(".ux4g-dropdown-menu");
    if (menu && window.ux4g && window.ux4g.repositionMenu) {
      window.ux4g.repositionMenu(dropdown, menu);
    }
  };

  const setControlText = (dropdown, value) => {
    const hasValue = Boolean(value && String(value).trim());
    dropdown.classList.toggle("has-value", hasValue);

    const searchInput = dropdown.querySelector("[ux4g-dropdown-search]");
    if (searchInput) {
      if (dropdown.classList.contains("ux4g-dropdown-single")) {
        searchInput.value = value || "";
      } else {
        searchInput.value = "";
      }
      // Trigger filter logic to stay in sync
      searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }

    const valueNode = dropdown.querySelector("[ux4g-dropdown-value]");
    if (!valueNode) return;
    const placeholder = valueNode.getAttribute("data-placeholder") || "Please select..";
    valueNode.textContent = hasValue ? value : placeholder;
    valueNode.classList.toggle("is-placeholder", !hasValue);
  };

  const getInputLabel = (input) => {
    if (!input) return "";
    if (input.dataset.label) return input.dataset.label;
    if (input.value) return input.value;
    const option = input.closest(".ux4g-dropdown-option");
    const text = option?.querySelector(".ux4g-checkbox-label, .ux4g-dropdown-option-title");
    return text?.textContent?.trim() || "";
  };

  const getChoiceLabel = (choice) => {
    if (!choice) return "";
    return (choice.getAttribute("ux4g-dropdown-choice") || choice.textContent || "").trim();
  };

  const applySingleSelection = (dropdown, value) => {
    const chipsNode = dropdown.querySelector("[ux4g-dropdown-chips]");
    dropdown.classList.remove("has-selection");
    setControlText(dropdown, value);
    if (!chipsNode) return;
    chipsNode.innerHTML = "";
  };

  const setSingleSelectedOption = (dropdown, selectedOption) => {
    const options = dropdown.querySelectorAll(".ux4g-dropdown-single-option");
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      if (isSelected) {
        option.classList.add("is-selected", "active");
        option.setAttribute("aria-selected", "true");
      } else {
        option.classList.remove("is-selected", "active");
        option.setAttribute("aria-selected", "false");
      }
      const listItem = option.closest(".ux4g-list-item");
      if (listItem) listItem.setAttribute("aria-selected", String(isSelected));
    });
  };

  const renderMultiSelection = (dropdown) => {
    const chipsNode = dropdown.querySelector("[ux4g-dropdown-chips]");
    const checkedInputs = Array.from(
      dropdown.querySelectorAll(".ux4g-dropdown-option-input:checked")
    );
    const options = Array.from(dropdown.querySelectorAll(".ux4g-dropdown-option"));

    const hasSelection = checkedInputs.length > 0;
    dropdown.classList.toggle("has-selection", hasSelection && Boolean(chipsNode));
    options.forEach((option) => {
      const input = option.querySelector(".ux4g-dropdown-option-input");
      const isSelected = Boolean(input?.checked);
      option.classList.toggle("is-selected", isSelected);
      option.classList.toggle("active", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });

    setControlText(dropdown, "");
    if (!chipsNode) return;
    chipsNode.innerHTML = "";
    if (!chipsNode || !hasSelection) return;

    let chipSizeClass = "ux4g-input-chip-sm";
    if (dropdown.classList.contains("ux4g-dropdown-sm")) chipSizeClass = "ux4g-input-chip-xs";
    if (dropdown.classList.contains("ux4g-dropdown-lg")) chipSizeClass = "ux4g-input-chip";

    checkedInputs.forEach((input) => {
      const label = getInputLabel(input);
      if (!label) return;

      const chip = document.createElement("span");
      chip.className = `${chipSizeClass} ux4g-dropdown-chip`;
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      chip.setAttribute("aria-label", `Remove ${label}`);
      chip.setAttribute("data-input-id", input.id);
      chip.innerHTML = `<span class="ux4g-icon-outlined" aria-hidden="true">token</span><span>${label}</span><span class="ux4g-icon-outlined" aria-hidden="true">close</span>`;

      const closeBtn = chip.querySelector(".ux4g-icon-outlined:last-child");

      const clearSelection = (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.checked = false;
        renderMultiSelection(dropdown);
      };

      chip.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      if (closeBtn) {
        closeBtn.addEventListener("click", clearSelection);
      }

      chip.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          clearSelection(event);
        }
      });

      chipsNode.appendChild(chip);
    });
  };

  dropdowns.forEach((dropdown, index) => {
    const control = dropdown.querySelector(".ux4g-dropdown-control");
    const menu = dropdown.querySelector(".ux4g-dropdown-menu");
    if (!control || !menu) return;

    if (!control.id) {
      control.id = `ux4g-dropdown-control-${index + 1}`;
    }

    const popupRole = menu.getAttribute("role") === "menu" ? "menu" : "listbox";
    control.setAttribute("aria-haspopup", popupRole);
    control.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-labelledby", control.id);

    const isSingle = dropdown.classList.contains("ux4g-dropdown-single");
    const isMulti = dropdown.classList.contains("ux4g-dropdown-multi");

    const dropdownInputs = Array.from(menu.querySelectorAll(".ux4g-dropdown-option-input"));
    dropdownInputs.forEach((input, inputIndex) => {
      if (!input.id) {
        input.id = `${control.id}-option-${inputIndex + 1}`;
      }
    });

    control.addEventListener("click", (event) => {
      // Prevent interactions if disabled
      if (control.disabled || control.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.target.closest("[ux4g-dropdown-search]")) {
        if (!dropdown.classList.contains("is-open")) {
          openDropdown(dropdown);
        }
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (dropdown.classList.contains("is-open")) closeDropdown(dropdown);
      else openDropdown(dropdown);
    });

    menu.addEventListener("click", (event) => {
      const choice = event.target.closest("[ux4g-dropdown-choice]");
      if (!choice) return;

      // Stop propagation to prevent global list JS from re-adding 'active' class
      event.stopPropagation();

      const value = getChoiceLabel(choice);
      if (!value) return;

      if (isSingle) {
        setSingleSelectedOption(dropdown, choice);
        applySingleSelection(dropdown, value);
      } else if (!isMulti) {
        setSingleSelectedOption(dropdown, choice); // Also set option for regular single selection
        applySingleSelection(dropdown, value);
      }

      closeDropdown(dropdown);
    });

    menu.addEventListener("change", (event) => {
      const input = event.target.closest(".ux4g-dropdown-option-input");
      if (!input) return;

      if (isMulti) {
        renderMultiSelection(dropdown);
        return;
      }

      if (input.checked && !isMulti) {
        menu.querySelectorAll(".ux4g-dropdown-option-input").forEach((item) => {
          if (item !== input) item.checked = false;
        });
      }

      applySingleSelection(dropdown, input.checked ? getInputLabel(input) : "");
      closeDropdown(dropdown);
    });

    menu.addEventListener("click", (event) => {
      const row = event.target.closest(".ux4g-list-item-row");
      if (!row) return;

      const isActionDropdown =
        dropdown.classList.contains("ux4g-dropdown-button") ||
        dropdown.classList.contains("ux4g-dropdown-overflow");

      if (isActionDropdown && !row.hasAttribute("ux4g-dropdown-choice")) {
        closeDropdown(dropdown);
      }
    });

    if (isMulti) {
      const searchInput = dropdown.querySelector("[ux4g-dropdown-search]");
      if (searchInput) {
        const icon = searchInput.previousElementSibling;
        if (icon && icon.classList.contains("ux4g-icon-outlined") && !searchInput.closest(".ux4g-dropdown-input-wrap")) {
          const wrapper = document.createElement("span");
          wrapper.className = "ux4g-dropdown-input-wrap";
          icon.parentNode.insertBefore(wrapper, icon);
          wrapper.appendChild(icon);
          wrapper.appendChild(searchInput);
        }
      }
      renderMultiSelection(dropdown);
      return;
    }

    const preselectedSingle = menu.querySelector(
      ".ux4g-dropdown-single-option.is-selected, .ux4g-dropdown-single-option[aria-selected='true']"
    );
    if (preselectedSingle) {
      setSingleSelectedOption(dropdown, preselectedSingle);
      applySingleSelection(dropdown, getChoiceLabel(preselectedSingle));
      return;
    }

    const preselectedChoice = menu.querySelector("[ux4g-dropdown-choice][aria-selected='true']");
    if (preselectedChoice) {
      applySingleSelection(dropdown, getChoiceLabel(preselectedChoice));
      return;
    }

    const preselectedInput = menu.querySelector(".ux4g-dropdown-option-input:checked");
    applySingleSelection(dropdown, preselectedInput ? getInputLabel(preselectedInput) : "");
  });

  document.addEventListener("click", (event) => {
    dropdowns.forEach((dropdown) => {
      if (!dropdown.contains(event.target)) closeDropdown(dropdown);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") dropdowns.forEach((dropdown) => closeDropdown(dropdown));
  });
});


/* =========================================
DROPDOWN SEARCH
========================================= */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[ux4g-dropdown-search]").forEach((input) => {

    const dropdown = input.closest(".ux4g-dropdown");
    const menu = dropdown.querySelector(".ux4g-dropdown-menu");

    input.addEventListener("focus", () => {
      dropdown.classList.add("is-open");
      if (window.ux4g && window.ux4g.repositionMenu) {
        window.ux4g.repositionMenu(dropdown, menu);
      }
    });

    input.addEventListener("input", () => {
      const value = input.value;
      const filterMode = dropdown.getAttribute("ux4g-dropdown-filter") || "contains";

      dropdown.classList.add("is-open");
      if (window.ux4g && window.ux4g.repositionMenu) {
        window.ux4g.repositionMenu(dropdown, menu);
      }

      const options = dropdown.querySelectorAll(
        ".ux4g-dropdown-single-option, .ux4g-dropdown-option"
      );

      options.forEach(option => {
        const originalText = option.dataset.originalText || option.textContent.trim();
        if (!option.dataset.originalText) option.dataset.originalText = originalText;

        const isMatch = window.ux4g.filterCore.matches(originalText, value, filterMode);
        option.style.display = isMatch ? "" : "none";

        // Optional: Add highlighting for Dropdown Search too
        const labelNode = option.querySelector(".ux4g-checkbox-label, .ux4g-dropdown-option-title, .ux4g-list-item-start");
        if (labelNode) {
          if (value && isMatch) {
            labelNode.innerHTML = window.ux4g.filterCore.highlight(originalText, value, filterMode);
          } else {
            labelNode.textContent = originalText;
          }
        }
      });
    });

    // Sync disabled state
    const control = dropdown.querySelector(".ux4g-dropdown-control");
    if (control && (control.disabled || control.getAttribute("aria-disabled") === "true")) {
      input.disabled = true;
    }
  });
});

/* ========================================================= combobox js ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  const comboboxs = Array.from(document.querySelectorAll(".ux4g-combobox"));
  if (!comboboxs.length) return;

  const closeCombobox = (combobox) => {
    combobox.classList.remove("is-open");
    const control = combobox.querySelector(".ux4g-combobox-control");
    if (control) control.setAttribute("aria-expanded", "false");
  };

  const openCombobox = (combobox) => {
    comboboxs.forEach((item) => {
      if (item !== combobox) closeCombobox(item);
    });
    combobox.classList.add("is-open");
    const control = combobox.querySelector(".ux4g-combobox-control");
    if (control) control.setAttribute("aria-expanded", "true");

    const menu = combobox.querySelector(".ux4g-combobox-menu");
    if (menu && window.ux4g && window.ux4g.repositionMenu) {
      window.ux4g.repositionMenu(combobox, menu);
    }
  };

  const setControlText = (combobox, value) => {
    const searchInput = combobox.querySelector("[ux4g-combobox-search]");
    if (searchInput) {
      if (combobox.classList.contains("ux4g-combobox-single")) {
        searchInput.value = value || "";
      } else {
        searchInput.value = "";
      }
      return;
    }

    const valueNode = combobox.querySelector("[ux4g-combobox-value]");
    const hasValue = Boolean(value && String(value).trim());
    if (!valueNode) return;
    const placeholder = valueNode.getAttribute("data-placeholder") || "Please select..";
    valueNode.textContent = hasValue ? value : placeholder;
    valueNode.classList.toggle("is-placeholder", !hasValue);
  };

  const getInputLabel = (input) => {
    if (!input) return "";
    if (input.dataset.label) return input.dataset.label;
    if (input.value) return input.value;
    const option = input.closest(".ux4g-combobox-option");
    const text = option?.querySelector(".ux4g-checkbox-label, .ux4g-combobox-option-title");
    return text?.textContent?.trim() || "";
  };

  const getChoiceLabel = (choice) => {
    if (!choice) return "";
    return (choice.getAttribute("ux4g-combobox-choice") || choice.textContent || "").trim();
  };

  const applySingleSelection = (combobox, value) => {
    const chipsNode = combobox.querySelector("[ux4g-combobox-chips]");
    combobox.classList.remove("has-selection");
    setControlText(combobox, value);
    if (!chipsNode) return;
    chipsNode.innerHTML = "";
  };

  const setSingleSelectedOption = (combobox, selectedOption) => {
    const options = combobox.querySelectorAll(".ux4g-combobox-single-option");
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("is-selected", isSelected);
      option.classList.toggle("active", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
      const listItem = option.closest(".ux4g-list-item");
      if (listItem) listItem.setAttribute("aria-selected", String(isSelected));
    });
  };

  const renderMultiSelection = (combobox) => {
    const chipsNode = combobox.querySelector("[ux4g-combobox-chips]");
    const checkedInputs = Array.from(
      combobox.querySelectorAll(".ux4g-combobox-option-input:checked")
    );
    const options = Array.from(combobox.querySelectorAll(".ux4g-combobox-option"));

    const hasSelection = checkedInputs.length > 0;
    combobox.classList.toggle("has-selection", hasSelection && Boolean(chipsNode));
    options.forEach((option) => {
      const input = option.querySelector(".ux4g-combobox-option-input");
      const isSelected = Boolean(input?.checked);
      option.classList.toggle("is-selected", isSelected);
      option.classList.toggle("active", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });

    setControlText(combobox, "");
    if (!chipsNode) return;
    chipsNode.style.display = "contents";
    chipsNode.innerHTML = "";
    if (!chipsNode || !hasSelection) return;

    let chipSizeClass = "ux4g-input-chip-sm";
    if (combobox.classList.contains("ux4g-combobox-sm")) chipSizeClass = "ux4g-input-chip-xs";
    if (combobox.classList.contains("ux4g-combobox-lg")) chipSizeClass = "ux4g-input-chip";

    checkedInputs.forEach((input) => {
      const label = getInputLabel(input);
      if (!label) return;

      const chip = document.createElement("span");
      chip.className = `${chipSizeClass} ux4g-combobox-chip`;
      chip.setAttribute("role", "button");
      chip.setAttribute("tabindex", "0");
      chip.setAttribute("aria-label", `Remove ${label}`);
      chip.setAttribute("data-input-id", input.id);
      chip.innerHTML = `<span class="ux4g-icon-outlined" aria-hidden="true">token</span><span>${label}</span><span class="ux4g-icon-outlined" aria-hidden="true">close</span>`;

      const closeBtn = chip.querySelector(".ux4g-icon-outlined:last-child");

      const clearSelection = (event) => {
        event.preventDefault();
        event.stopPropagation();
        input.checked = false;
        renderMultiSelection(combobox);
      };

      chip.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });

      if (closeBtn) {
        closeBtn.addEventListener("click", clearSelection);
      }

      chip.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          clearSelection(event);
        }
      });

      chipsNode.appendChild(chip);
    });
  };

  const DEBOUNCE_DELAY = 150;
  const debounce = (fn, delay) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  function toggleNoResults(menu, show) {
    let el = menu.querySelector(".ux4g-combobox-no-results");
    if (show) {
      if (!el) {
        el = document.createElement("div");
        el.className = "ux4g-combobox-no-results ux4g-p-s ux4g-text-center ux4g-text-muted";
        el.textContent = "No results found";
        menu.appendChild(el);
      }
      el.style.display = "";
    } else if (el) {
      el.style.display = "none";
    }
  }

  comboboxs.forEach((combobox, index) => {
    const control = combobox.querySelector(".ux4g-combobox-control");
    const menu = combobox.querySelector(".ux4g-combobox-menu");
    const input = combobox.querySelector("[ux4g-combobox-search]");
    const caret = combobox.querySelector(".ux4g-combobox-caret");

    if (!control || !menu) return;

    if (!control.id) {
      control.id = `ux4g-combobox-control-${index + 1}`;
    }

    const popupRole = menu.getAttribute("role") === "menu" ? "menu" : "listbox";
    control.setAttribute("aria-haspopup", popupRole);
    control.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-labelledby", control.id);

    const isSingle = combobox.classList.contains("ux4g-combobox-single");
    const isMulti = combobox.classList.contains("ux4g-combobox-multi");
    const filterMode = combobox.getAttribute("ux4g-combobox-filter") || "contains";

    const comboboxInputs = Array.from(menu.querySelectorAll(".ux4g-combobox-option-input"));
    comboboxInputs.forEach((input, inputIndex) => {
      if (!input.id) {
        input.id = `${control.id}-option-${inputIndex + 1}`;
      }
    });

    const options = isMulti
      ? Array.from(combobox.querySelectorAll(".ux4g-combobox-option"))
      : Array.from(combobox.querySelectorAll(".ux4g-combobox-single-option"));

    // Store original text for filtering
    options.forEach((option) => {
      let labelNode = isMulti
        ? option.querySelector(".ux4g-checkbox-label")
        : option.querySelector(".ux4g-list-item-start");

      option.dataset.originalText = labelNode
        ? labelNode.textContent.trim()
        : option.textContent.trim();
    });

    const handleFilter = () => {
      if (!input) return;
      const value = input.value;
      let visibleCount = 0;

      options.forEach((option) => {
        const originalText = option.dataset.originalText;
        const isMatch = window.ux4g.filterCore.matches(originalText, value, filterMode);
        
        option.style.display = isMatch ? "" : "none";

        const labelNode = isMulti
          ? option.querySelector(".ux4g-checkbox-label")
          : option.querySelector(".ux4g-list-item-start");

        if (labelNode) {
          if (value && isMatch) {
            labelNode.innerHTML = window.ux4g.filterCore.highlight(originalText, value, filterMode);
          } else {
            labelNode.textContent = originalText;
          }
        }
        if (isMatch) visibleCount++;
      });
      toggleNoResults(menu, visibleCount === 0 && value.trim());
    };

    if (input) {
      input.addEventListener("focus", () => openCombobox(combobox));
      input.addEventListener("input", debounce(() => {
        openCombobox(combobox);
        if (isSingle && input.value.trim() === "") {
          setSingleSelectedOption(combobox, null);
          applySingleSelection(combobox, "");
        }
        handleFilter();
      }, DEBOUNCE_DELAY));
    }

    if (caret) {
      caret.addEventListener("click", (e) => {
        e.stopPropagation();
        combobox.classList.contains("is-open") ? closeCombobox(combobox) : openCombobox(combobox);
      });
    }

    control.addEventListener("click", (event) => {
      if (control.disabled || control.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.target.closest("[ux4g-combobox-search]")) {
        if (!combobox.classList.contains("is-open")) openCombobox(combobox);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      if (combobox.classList.contains("is-open")) closeCombobox(combobox);
      else openCombobox(combobox);
    });

    menu.addEventListener("click", (event) => {
      const choice = event.target.closest("[ux4g-combobox-choice]");
      if (!choice) {
        // Handle Action Combobox closing
        const row = event.target.closest(".ux4g-list-item-row");
        if (row) {
          const isActionCombobox =
            combobox.classList.contains("ux4g-combobox-button") ||
            combobox.classList.contains("ux4g-combobox-overflow");
          if (isActionCombobox) {
            closeCombobox(combobox);
          }
        }
        return;
      }
      event.stopPropagation();

      const value = getChoiceLabel(choice);
      if (!value) return;

      if (isSingle) {
        setSingleSelectedOption(combobox, choice);
        applySingleSelection(combobox, value);
        handleFilter(); // Reset highlight
      } else if (!isMulti) {
        applySingleSelection(combobox, value);
      }
      closeCombobox(combobox);
    });

    menu.addEventListener("change", (event) => {
      const inputEl = event.target.closest(".ux4g-combobox-option-input");
      if (!inputEl) return;

      if (isMulti) {
        renderMultiSelection(combobox);
        handleFilter();
        return;
      }

      if (inputEl.checked && !isMulti) {
        menu.querySelectorAll(".ux4g-combobox-option-input").forEach((item) => {
          if (item !== inputEl) item.checked = false;
        });
      }

      applySingleSelection(combobox, inputEl.checked ? getInputLabel(inputEl) : "");
      closeCombobox(combobox);
    });

    if (isMulti) {
      if (input) {
        const icon = input.previousElementSibling;
        if (icon && icon.classList.contains("ux4g-icon-outlined") && !input.closest(".ux4g-combobox-input-wrap")) {
          const wrapper = document.createElement("span");
          wrapper.className = "ux4g-combobox-input-wrap";
          icon.parentNode.insertBefore(wrapper, icon);
          wrapper.appendChild(icon);
          wrapper.appendChild(input);
        }
      }
      renderMultiSelection(combobox);
      return;
    }

    const preselectedSingle = menu.querySelector(
      ".ux4g-combobox-single-option.is-selected, .ux4g-combobox-single-option[aria-selected='true']"
    );
    if (preselectedSingle) {
      setSingleSelectedOption(combobox, preselectedSingle);
      applySingleSelection(combobox, getChoiceLabel(preselectedSingle));
      return;
    }

    const preselectedChoice = menu.querySelector("[ux4g-combobox-choice][aria-selected='true']");
    if (preselectedChoice) {
      applySingleSelection(combobox, getChoiceLabel(preselectedChoice));
      return;
    }

    const preselectedInput = menu.querySelector(".ux4g-combobox-option-input:checked");
    if (preselectedInput) {
      applySingleSelection(combobox, getInputLabel(preselectedInput));
    }
  });

  document.addEventListener("click", (event) => {
    comboboxs.forEach((combobox) => {
      if (!combobox.contains(event.target)) closeCombobox(combobox);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") comboboxs.forEach((combobox) => closeCombobox(combobox));
  });
});


/* ========================================================= ux4g Tabs ========================================================= */


(function (global) {
  'use strict';

  class UX4GTab {

    constructor(rootEl, options = {}) {
      if (!(rootEl instanceof HTMLElement)) {
        throw new Error('UX4GTab: rootEl must be an HTMLElement');
      }

      this.root = rootEl;
      this.options = Object.assign({ onChange: null }, options);

      this._detectConfig();
      this._cleanInitialState();
      this._bindEvents();
    }

    /* Detect elements */
    _detectConfig() {
      this.list = this.root.querySelector('.ux4g-tab-list');
      this.items = Array.from(
        this.list.querySelectorAll('.ux4g-tab-item:not(.ux4g-tab-more)')
      );
      this.moreBtns = Array.from(
        this.list.querySelectorAll('.ux4g-tab-more')
      );
      this.panels = Array.from(
        this.root.querySelectorAll('.ux4g-tab-panel')
      );
    }

    /* Clean any static open state */
    _cleanInitialState() {
      this.root.querySelectorAll('.ux4g-tab-dropdown-list.is-open')
        .forEach(d => d.classList.remove('is-open'));
    }

    /* Bind events */
    _bindEvents() {

      /* Regular tabs */
      this.items.forEach(item => {
        item.addEventListener('click', () => this._activateItem(item));
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            this._activateItem(item);
          }
        });
      });

      /* More dropdown */
      this.moreBtns.forEach(moreBtn => {
        const dropdown = moreBtn.querySelector('.ux4g-tab-dropdown-list');
        if (!dropdown) return;

        moreBtn.addEventListener('click', (e) => {
          const isDropdownClick = e.target.closest('.ux4g-tab-dropdown-list');

          if (!isDropdownClick) {
            e.stopPropagation();
            this._toggleDropdown(dropdown);
          }
        });

        // Add Enter key support to open dropdown
        moreBtn.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const isDropdownClick = e.target.closest('.ux4g-tab-dropdown-list');
            if (!isDropdownClick) {
              e.stopPropagation();
              this._toggleDropdown(dropdown);
            }
          }
        });

        dropdown.querySelectorAll('.ux4g-tab-dropdown-item')
          .forEach(dItem => {
            dItem.addEventListener('click', (e) => {
              e.stopPropagation();
              this._activateDropdownItem(dItem, moreBtn);
            });
            dItem.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                this._activateDropdownItem(dItem, moreBtn);
              }
            });
          });
      });

      /* Outside click (scoped) */
      document.addEventListener('click', (e) => {
        if (!this.root.contains(e.target)) {
          this._closeAllDropdowns();
        }
      });
    }

    /* Activate normal tab */
    _activateItem(item) {
      if (item.classList.contains('ux4g-tab-item-disabled')) return;

      this._resetActive();
      item.classList.add('is-active');

      const panelId = item.dataset.panel;
      if (panelId) this._showPanel(panelId);

      this._closeAllDropdowns();
      this._emitChange(panelId);
    }

    /* Activate dropdown item */
    _activateDropdownItem(dItem, moreBtn) {
      this._resetActive();

      moreBtn.classList.add('is-active');
      dItem.classList.add('is-active');

      const panelId = dItem.dataset.panel;
      if (panelId) this._showPanel(panelId);

      this._closeAllDropdowns();
      this._emitChange(panelId);
    }

    /* Reset active states */
    _resetActive() {
      this.list.querySelectorAll('.ux4g-tab-item')
        .forEach(i => i.classList.remove('is-active'));

      this.root.querySelectorAll('.ux4g-tab-dropdown-item')
        .forEach(i => i.classList.remove('is-active'));
    }

    /* Show panel */
    _showPanel(panelId) {
      this.panels.forEach(p => p.classList.remove('is-active'));
      const target = this.root.querySelector('#' + panelId);
      if (target) target.classList.add('is-active');
    }

    /* Toggle dropdown */
    _toggleDropdown(dropdown) {
      const isOpen = dropdown.classList.contains('is-open');
      this._closeAllDropdowns();

      if (!isOpen) {
        dropdown.classList.add('is-open');
      }
    }

    /* Close dropdowns (scoped) */
    _closeAllDropdowns() {
      this.root.querySelectorAll('.ux4g-tab-dropdown-list.is-open')
        .forEach(d => d.classList.remove('is-open'));
    }

    /* Emit change */
    _emitChange(panelId) {
      if (typeof this.options.onChange === 'function') {
        this.options.onChange(panelId);
      }
    }

    /* Init all */
    static initAll(scope = document) {
      return Array.from(scope.querySelectorAll('[data-ux4g-tab]'))
        .map(el => new UX4GTab(el));
    }
  }

  global.UX4GTab = UX4GTab;

})(window);

/* Auto init */
document.addEventListener('DOMContentLoaded', () => {
  UX4GTab.initAll();
});

/* ========================================================= slider js ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

  /* =========================================================
     HELPERS
  ========================================================= */

  const pct = (val, min, max) => ((val - min) / (max - min)) * 100;

  const buildSteps = (container, min, max, step) => {
    if (!container) return;

    let html = "";

    for (let v = min; v <= max; v += step) {
      const p = pct(v, min, max);

      html += `
        <div class="ux4g-slider-step" data-value="${v}" style="left:${p}%">
          <span class="ux4g-slider-step-mark"></span>
          <span class="ux4g-slider-step-label">${v}</span>
        </div>
      `;
    }

    container.innerHTML = html;
  };

  /* =========================================================
     SINGLE SLIDERS
  ========================================================= */

  const singleSliders = document.querySelectorAll(
    ".ux4g-slider:not(.ux4g-slider-dual)"
  );

  singleSliders.forEach((slider) => {

    const input = slider.querySelector(".ux4g-slider-input");
    const fill = slider.querySelector(".ux4g-slider-fill");
    const thumb = slider.querySelector(".ux4g-slider-thumb");
    const steps = slider.querySelector(".ux4g-slider-steps");

    if (!input) return;

    const valueBox =
      slider.closest(".ux4g-slider-field")?.querySelector(
        ".ux4g-slider-range-box"
      );
    const valueBadge =
      slider.closest(".ux4g-slider-field")?.querySelector(
        ".ux4g-slider-value-badge"
      );

    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    const step = parseFloat(input.step) || 10;

    /* Helper: Make badge editable */
    const initBadgeEdit = (badge, targetInput) => {
      if (!badge) return;
      badge.setAttribute("contenteditable", "true");
      badge.style.cursor = "text";

      // Strict number only entry
      badge.addEventListener("keypress", (e) => {
        if (!/[0-9]/.test(e.key) && e.key !== "Enter") {
          e.preventDefault();
        }
      });
      
      badge.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          badge.blur();
        }
      });

      badge.addEventListener("blur", () => {
        let raw = badge.textContent.replace(/[^0-9]/g, "");
        let val = parseInt(raw, 10);
        if (isNaN(val)) val = parseFloat(targetInput.value);
        
        // Clamp 0-100
        val = Math.min(max, Math.max(min, val));
        
        targetInput.value = val;
        // Trigger input event to update everything
        targetInput.dispatchEvent(new Event("input"));
        
        // Re-apply suffix if needed
        const suffix = badge.textContent.includes("%") ? "%" : "";
        badge.textContent = val + suffix;
      });
    };

    if (valueBox) initBadgeEdit(valueBox, input);

    /* Build Steps */

    buildSteps(steps, min, max, step);

    const stepEls = slider.querySelectorAll(".ux4g-slider-step");

    const update = () => {

      const val = parseFloat(input.value);
      const p = pct(val, min, max);

      if (fill) fill.style.width = p + "%";
      if (thumb) thumb.style.left = p + "%";

      // Only update text containers if not currently editing
      const containers = [valueBadge, valueBox];
      containers.forEach(container => {
        if (container && document.activeElement !== container) {
          const suffix = container.textContent.includes("%") ? "%" : "";
          container.textContent = val + suffix;
        }
      });

      stepEls.forEach((el) => {
        const sv = parseFloat(el.dataset.value);
        el.classList.toggle("is-active", sv <= val);
      });

    };

    input.addEventListener("input", update);

    update();

  });

  /* =========================================================
     DUAL RANGE SLIDERS
  ========================================================= */

  const dualSliders = document.querySelectorAll(".ux4g-slider-dual");

  dualSliders.forEach((slider) => {

    const inputMin = slider.querySelector(".ux4g-slider-input-min");
    const inputMax = slider.querySelector(".ux4g-slider-input-max");

    const fill = slider.querySelector(".ux4g-slider-fill");
    const thumbMin = slider.querySelector(".ux4g-slider-thumb-min");
    const thumbMax = slider.querySelector(".ux4g-slider-thumb-max");

    const steps = slider.querySelector(".ux4g-slider-steps");

    const field = slider.closest(".ux4g-slider-field");

    const minBox = field?.querySelector(".ux4g-slider-range-box:first-of-type, .ux4g-slider-range-box");
    // Actually better to select all and differentiate if multiple exist
    const rangeBoxes = field?.querySelectorAll(".ux4g-slider-range-box");
    const valueBadges = field?.querySelectorAll(".ux4g-slider-value-badge");

    if (!inputMin || !inputMax) return;

    const min = parseFloat(inputMin.min) || 0;
    const max = parseFloat(inputMin.max) || 100;
    const step = parseFloat(inputMin.step) || 10;

    /* Helper: Make box editable */
    const initBoxEdit = (badge, targetInput) => {
      if (!badge) return;
      badge.setAttribute("contenteditable", "true");
      badge.style.cursor = "text";
      
      // Strict number only entry
      badge.addEventListener("keypress", (e) => {
        if (!/[0-9]/.test(e.key) && e.key !== "Enter") {
          e.preventDefault();
        }
      });

      badge.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          badge.blur();
        }
      });

      badge.addEventListener("blur", () => {
        let raw = badge.textContent.replace(/[^0-9]/g, "");
        let val = parseInt(raw, 10);
        if (isNaN(val)) val = parseFloat(targetInput.value);
        
        // Clamp min-max
        val = Math.min(max, Math.max(min, val));
        
        targetInput.value = val;
        // Trigger change to validate cross limits
        targetInput.dispatchEvent(new Event("input"));

        // Re-apply suffix
        const suffix = badge.textContent.includes("%") ? "%" : "";
        badge.textContent = val + suffix;
      });
    };

    if (rangeBoxes?.[0]) initBoxEdit(rangeBoxes[0], inputMin);
    if (rangeBoxes?.[1]) initBoxEdit(rangeBoxes[1], inputMax);

    buildSteps(steps, min, max, step);

    const stepEls = slider.querySelectorAll(".ux4g-slider-step");

    const update = (e) => {

      let vMin = parseFloat(inputMin.value);
      let vMax = parseFloat(inputMax.value);

      /* Prevent crossing */

      if (e?.target === inputMin && vMin >= vMax) {
        inputMin.value = vMax - step;
        vMin = parseFloat(inputMin.value);
      }

      if (e?.target === inputMax && vMax <= vMin) {
        inputMax.value = vMin + step;
        vMax = parseFloat(inputMax.value);
      }

      const pMin = pct(vMin, min, max);
      const pMax = pct(vMax, min, max);

      if (fill) {
        fill.style.left = pMin + "%";
        fill.style.width = (pMax - pMin) + "%";
      }

      if (thumbMin) thumbMin.style.left = pMin + "%";
      if (thumbMax) thumbMax.style.left = pMax + "%";

      // Sync dual badges
      if (valueBadges?.[0] && document.activeElement !== valueBadges[0]) {
        valueBadges[0].textContent = vMin + (valueBadges[0].textContent.includes("%") ? "%" : "");
      }
      if (valueBadges?.[1] && document.activeElement !== valueBadges[1]) {
        valueBadges[1].textContent = vMax + (valueBadges[1].textContent.includes("%") ? "%" : "");
      }

      // Sync dual boxes
      if (rangeBoxes?.[0] && document.activeElement !== rangeBoxes[0]) {
        rangeBoxes[0].textContent = vMin + (rangeBoxes[0].textContent.includes("%") ? "%" : "");
      }
      if (rangeBoxes?.[1] && document.activeElement !== rangeBoxes[1]) {
        rangeBoxes[1].textContent = vMax + (rangeBoxes[1].textContent.includes("%") ? "%" : "");
      }
      
      /* Thumb overlap fix */

      if (pMax - pMin < 10) {

        inputMin.style.zIndex = pMin > 50 ? "5" : "3";
        inputMax.style.zIndex = pMin > 50 ? "3" : "5";

      } else {

        inputMin.style.zIndex = "";
        inputMax.style.zIndex = "";

      }

      /* Active steps */

      stepEls.forEach((el) => {

        const sv = parseFloat(el.dataset.value);

        el.classList.toggle(
          "is-active",
          sv >= vMin && sv <= vMax
        );

      });

    };

    inputMin.addEventListener("input", update);
    inputMax.addEventListener("input", update);

    update();

  });

});


/* ========================================================= context alert js ========================================================= */
/* Trigger Toast alerts via data attributes */
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-ux4g-toggle="toast"]').forEach(btn => {
        btn.addEventListener('click', () => {
            const position = btn.dataset.ux4gPosition || 'top-right';
            const variant = btn.dataset.ux4gVariant || btn.dataset.ux4gStatus;
            const title = btn.dataset.ux4gTitle;
            const body = btn.dataset.ux4gBody;
            showContextAlert(position, variant, title, body);
        });
    });
});

let alertCount = 0;

/**
 * Shows a Context Alert (Toast) in the specified position with animation
 * @param {string} position - 'top-left', 'top-right', 'bottom-left', or 'bottom-right'
 * @param {string} [variant] - Optional: 'info', 'success', 'warning', 'error', 'none'
 * @param {string} [customTitle] - Optional custom title text
 * @param {string} [customBody] - Optional custom body text
 */
function showContextAlert(position, variant, customTitle, customBody) {
    const statuses = {
        'info': { icon: 'info', title: 'Info ' },
        'success': { icon: 'check_circle', title: 'Success ' },
        'warning': { icon: 'warning', title: 'Warning ' },
        'error': { icon: 'error', title: 'Error ' },
        'none': { icon: null, title: 'Alert Title' }
    };

    // Determine type (use variant, or cycle through if not provided)
    const types = Object.keys(statuses).filter(t => t !== 'none');
    const type = variant || types[alertCount++ % types.length];
    const status = statuses[type] || statuses['info'];

    const title = customTitle || status.title;
    const bodyText = customBody || `This is a ${type} alert shown at the ${position.replace('-', ' ')} corner.`;

    const containerId = `ux4g-alert-container-${position}`;
    let container = document.getElementById(containerId);
    
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = `ux4g-alert-container ux4g-alert-${position}`;
        document.body.appendChild(container);
    }

    const alert = document.createElement('div');
    const animationClass = position.includes('left') ? 'ux4g-animate-left' : 'ux4g-animate-right';
    
    // Apply correct status class (fallback to info if variant is 'none' for styling)
    const statusClass = type === 'none' ? 'info' : type;
    alert.className = `ux4g-context-alert ux4g-alert-${statusClass} ${animationClass}`;
    
    // Icon Logic: None means no icon HTML
    const iconHtml = status.icon ? `<i class="ux4g-icon ux4g-alert-icon">${status.icon}</i>` : '';

    alert.innerHTML = `
        ${iconHtml}
        <span class="ux4g-alert-title">${title}</span>
        <div class="ux4g-alert-actions">
            <button class="ux4g-alert-close" onclick="closeContextAlert(this)">
                <i class="ux4g-icon">close</i>
            </button>
        </div>
        <div class="ux4g-alert-message">${bodyText}</div>
    `;

    if (position.includes('bottom')) {
        container.insertBefore(alert, container.firstChild);
    } else {
        container.appendChild(alert);
    }

    setTimeout(() => {
        if (alert.parentNode) closeAlertWithAnimation(alert);
    }, 5000);
}

/**
 * Handles manual close click
 */
function closeContextAlert(button) {
    const alert = button.closest('.ux4g-context-alert');
    if (alert) {
        closeAlertWithAnimation(alert);
    }
}

/**
 * Closes an alert with a slide-out animation
 */
function closeAlertWithAnimation(alert) {
    if (!alert) return;
    
    const isLeft = alert.classList.contains('ux4g-animate-left');
    alert.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    alert.style.transform = isLeft ? 'translateX(-100%)' : 'translateX(100%)';
    alert.style.opacity = '0';
    
    // Remove element after animation completes
    setTimeout(() => {
        if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
        }
    }, 400);
}


/* ========================================================= pagination js ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const pageSelects = document.querySelectorAll(".ux4g-page-size select");
    
    pageSelects.forEach(select => {
        const wrapper = select.closest(".ux4g-page-size-select-wrapper");
        
        const updateState = () => {
            if (wrapper) {
                // If there's a selected option that isn't empty (or for simplicity, any selection)
                if (select.value) {
                    wrapper.classList.add("has-value");
                } else {
                    wrapper.classList.remove("has-value");
                }
            }
        };

        select.addEventListener("change", updateState);
        // Do not run on load, so we show the placeholder icon by default
    });
});


// NPS and Emoji Button interactions
document.addEventListener('DOMContentLoaded', () => {
    // NPS interaction
    const npsButtons = document.querySelectorAll('.feedback-nps-button');
    npsButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.closest('.ux4g-feedback-nps-wrapper') || btn.parentElement;
            const siblings = Array.from(container.querySelectorAll('.feedback-nps-button'));
            const clickedIndex = siblings.indexOf(btn);
            
            // If clicking the highest active button, reset it (toggle off)
            const isHighestActive = btn.classList.contains('active') && 
                (clickedIndex === siblings.length - 1 || !siblings[clickedIndex + 1]?.classList.contains('active'));
                
            if (isHighestActive) {
                siblings.forEach(s => s.classList.remove('active'));
                container.removeAttribute('data-nps-rating');
            } else {
                container.setAttribute('data-nps-rating', clickedIndex);
                siblings.forEach((s, i) => {
                    if (i <= clickedIndex) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            }
        });
    });

    // Emoji interaction
    const emojiButtons = document.querySelectorAll('.feedback-emoji-button');
    emojiButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const wasActive = btn.classList.contains('active');
            const container = btn.closest('.ux4g-d-flex') || document;
            container.querySelectorAll('.feedback-emoji-button').forEach(b => b.classList.remove('active'));
            
            if (!wasActive) {
                btn.classList.add('active');
            }
        });
    });

    // Star interaction
    const stars = document.querySelectorAll('.ux4g-feedback-star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const container = star.parentElement;
            const siblings = Array.from(container.querySelectorAll('.ux4g-feedback-star'));
            const clickedIndex = siblings.indexOf(star);
            
            // If clicking the only active star, reset it (toggle off)
            const isOnlyActive = star.classList.contains('active') && 
                (clickedIndex === siblings.length - 1 || !siblings[clickedIndex + 1].classList.contains('active'));
                
            if (isOnlyActive) {
                siblings.forEach(s => s.classList.remove('active'));
                container.removeAttribute('data-rating');
            } else {
                container.setAttribute('data-rating', clickedIndex + 1);
                siblings.forEach((s, i) => {
                    if (i <= clickedIndex) {
                        s.classList.add('active');
                    } else {
                        s.classList.remove('active');
                    }
                });
            }
        });
    });

    // Submit and Skip Reset interaction
    const resetButtons = document.querySelectorAll('.ux4g-feedback .ux4g-btn-primary, .ux4g-feedback .ux4g-btn-text-primary');
    resetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const feedbackContainer = btn.closest('.ux4g-feedback');
            if (feedbackContainer) {
                // Clear textareas
                feedbackContainer.querySelectorAll('textarea').forEach(textarea => {
                    textarea.value = '';
                });
                // Clear active states on all feedback interactive elements
                feedbackContainer.querySelectorAll('.active').forEach(activeEl => {
                    activeEl.classList.remove('active');
                });
            }
        });
    });
});



/* ========================================================= carousel js ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const carousels = document.querySelectorAll(".ux4g-carousel");

    carousels.forEach(carousel => {
        const slidesContainer = carousel.querySelector(".ux4g-carousel-slides");
        const slides = carousel.querySelectorAll(".ux4g-carousel-slide");
        const slideCount = slides.length;
        const prevBtn = carousel.querySelector(".ux4g-carousel-arrow-prev");
        const nextBtn = carousel.querySelector(".ux4g-carousel-arrow-next");
        const dots = carousel.querySelectorAll(".ux4g-carousel-dot");
        
        if (slideCount === 0) return;

        let currentIndex = 0;

        // Initialize: find if any slide is already marked as active
        slides.forEach((slide, index) => {
            if (slide.classList.contains("is-active")) {
                currentIndex = index;
            }
        });

        const updateCarousel = (index) => {
            // Handle looping
            if (index < 0) {
                index = slideCount - 1;
            } else if (index >= slideCount) {
                index = 0;
            }
            
            currentIndex = index;
            
            // Move slides
            if (slidesContainer) {
                slidesContainer.style.transform = `translateX(-${currentIndex * 100}%)`;
            }
            
            // Update slides active state
            slides.forEach((slide, i) => {
                slide.classList.toggle("is-active", i === currentIndex);
                slide.setAttribute("aria-hidden", i !== currentIndex);
            });

            // Update dots active state
            dots.forEach((dot, i) => {
                dot.classList.toggle("is-active", i === currentIndex);
                dot.setAttribute("aria-current", i === currentIndex ? "step" : "false");
            });
        };

        // Event Listeners
        if (prevBtn) {
            prevBtn.addEventListener("click", (e) => {
                e.preventDefault();
                updateCarousel(currentIndex - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener("click", (e) => {
                e.preventDefault();
                updateCarousel(currentIndex + 1);
            });
        }

        dots.forEach((dot, index) => {
            dot.addEventListener("click", (e) => {
                e.preventDefault();
                updateCarousel(index);
            });
        });

        // Initial update to ensure everything is synced
        updateCarousel(currentIndex);
    });
});

/* ========================================================= range slider js ========================================================= */
document.addEventListener("input", (e) => {
    if (e.target.classList.contains("ux4g-slider-input")) {
        const sliderField = e.target.closest(".ux4g-slider-field");
        const slider = e.target.closest(".ux4g-slider");
        if (!slider) return;

        const isDual = slider.classList.contains("ux4g-slider-dual");
        const fill = slider.querySelector(".ux4g-slider-fill");
        
        if (!isDual) {
            const thumb = slider.querySelector(".ux4g-slider-thumb");
            const percent = ((e.target.value - e.target.min) / (e.target.max - e.target.min)) * 100;
            if (fill) fill.style.width = percent + "%";
            if (thumb) thumb.style.left = percent + "%";
            
            if (sliderField) {
                const badge = sliderField.querySelector(".ux4g-slider-value-badge");
                if (badge) badge.textContent = e.target.value + "%";
            }
        } else {
            const inputMin = slider.querySelector(".ux4g-slider-input-min");
            const inputMax = slider.querySelector(".ux4g-slider-input-max");
            const thumbMin = slider.querySelector(".ux4g-slider-thumb-min");
            const thumbMax = slider.querySelector(".ux4g-slider-thumb-max");
            
            let min = parseFloat(inputMin.value);
            let max = parseFloat(inputMax.value);
            const rangeMin = parseFloat(inputMin.min);
            const rangeMax = parseFloat(inputMin.max);
            
            if (e.target.classList.contains("ux4g-slider-input-min")) {
                if (min > max) {
                    min = max;
                    inputMin.value = min;
                }
            } else {
                if (max < min) {
                    max = min;
                    inputMax.value = max;
                }
            }
            
            const left = ((min - rangeMin) / (rangeMax - rangeMin)) * 100;
            const width = ((max - min) / (rangeMax - rangeMin)) * 100;
            
            if (fill) {
                fill.style.left = left + "%";
                fill.style.width = width + "%";
            }
            if (thumbMin) thumbMin.style.left = left + "%";
            if (thumbMax) thumbMax.style.left = (left + width) + "%";
            
            if (sliderField) {
                const badges = sliderField.querySelectorAll(".ux4g-slider-value-badge");
                if (badges.length >= 2) {
                    badges[0].textContent = min + "%";
                    badges[1].textContent = max + "%";
                }
            }
        }
    }
});


/********************************* UX4G DatePicker & TimePicker JS ***********************************/

(function (global) {
    "use strict";

    console.log('UX4G Components Script Loaded');

    const makeKeyboardClickable = (el) => {
        if (!el) return;
        if (el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') {
            if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    el.click();
                }
            });
        }
    };

    // Shared Backdrop
    let backdrop = document.querySelector('.ux4g-date-picker-backdrop');
    const getBackdrop = () => {
        if (!backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'ux4g-date-picker-backdrop'; 
            document.body.appendChild(backdrop);
        }
        return backdrop;
    };

    const isMobile = () => window.innerWidth <= 576;

    class DatePicker {
        constructor(container) {
            this.container = container;
            this.input = container.querySelector('.ux4g-date-picker-input');
            this.dropdown = container.querySelector('.ux4g-date-picker-dropdown');
            this.calendarGrid = container.querySelector('.ux4g-date-picker-grid');
            this.monthLabel = container.querySelector('.ux4g-date-picker-current');
            
            const navBtns = container.querySelectorAll('.ux4g-date-picker-nav-btn');
            this.prevBtn = navBtns[0];
            this.nextBtn = navBtns[1];
            
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');
            
            this.currentDate = new Date();
            this.viewDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            this.selectedDate = null;
            this.tempSelectedDate = null;
            
            this.isSelectingYearMonth = false;
            
            this._init();
        }

        _init() {
            if (!this.input || !this.dropdown) return;

            if (this.input.value) {
                const parts = this.input.value.split('/');
                if (parts.length === 3) {
                    this.selectedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    this.viewDate = new Date(parts[2], parts[1] - 1, 1);
                    this.tempSelectedDate = new Date(this.selectedDate);
                }
            }

            // Keyboard accessibility
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.open();
                }
            });

            this.input.addEventListener('focus', (e) => {
                this.open();
            });

            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });
            
            if (this.prevBtn) {
                makeKeyboardClickable(this.prevBtn);
                this.prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(-8);
                    } else {
                        this.changeMonth(-1);
                    }
                });
            }
            
            if (this.nextBtn) {
                makeKeyboardClickable(this.nextBtn);
                this.nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(8);
                    } else {
                        this.changeMonth(1);
                    }
                });
            }

            if (this.monthLabel) {
                makeKeyboardClickable(this.monthLabel);
                this.monthLabel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.isSelectingYearMonth = !this.isSelectingYearMonth;
                    this.render();
                    setTimeout(() => {
                        if (this.isSelectingYearMonth) {
                            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
                            let el = calendarContainer.querySelector('.ux4g-date-picker-year-item.is-selected') || calendarContainer.querySelector('.ux4g-date-picker-year-item');
                            if (el) el.focus();
                        } else {
                            let el = this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }
                    }, 0);
                });
            }

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.isSelectingYearMonth = false;
                        this.render();
                        setTimeout(() => {
                            let el = this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }, 0);
                    } else {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                makeKeyboardClickable(this.cancelBtn);
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cancelSelection();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            getBackdrop().addEventListener('click', () => {
                this.close();
            });

            this.render();
        }

        open() {
            if (this.dropdown) {
                this.tempSelectedDate = this.selectedDate ? new Date(this.selectedDate) : null;
                this.isSelectingYearMonth = false;
                this.dropdown.classList.add('is-open');
                if (isMobile()) {
                    getBackdrop().classList.add('is-active');
                    document.body.style.overflow = 'hidden';
                }
                this.render();
            }
        }

        close() {
            if (this.dropdown) {
                this.dropdown.classList.remove('is-open');
                getBackdrop().classList.remove('is-active');
                document.body.style.overflow = '';
            }
        }

        confirmSelection() {
            this.selectedDate = this.tempSelectedDate ? new Date(this.tempSelectedDate) : null;
            if (this.selectedDate) {
                const day = String(this.selectedDate.getDate()).padStart(2, '0');
                const month = String(this.selectedDate.getMonth() + 1).padStart(2, '0');
                const year = this.selectedDate.getFullYear();
                this.input.value = `${day}/${month}/${year}`;
            } else {
                this.input.value = '';
            }
            this.close();
        }

        cancelSelection() {
            this.tempSelectedDate = this.selectedDate ? new Date(this.selectedDate) : null;
            this.close();
        }

        changeMonth(delta) {
            this.viewDate.setMonth(this.viewDate.getMonth() + delta);
            this.render();
        }

        changeYearRange(delta) {
            this.viewDate.setFullYear(this.viewDate.getFullYear() + delta);
            this.render();
        }

        render() {
            if (this.isSelectingYearMonth) {
                this.renderYearMonthSelection();
            } else {
                this.renderCalendar();
            }
        }

        renderCalendar() {
            const year = this.viewDate.getFullYear();
            const month = this.viewDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${monthNames[month]} ${year} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            const calendarHtml = `
                <div class="ux4g-date-picker-weekdays">
                    <div class="ux4g-date-picker-weekday">Mo</div>
                    <div class="ux4g-date-picker-weekday">Tu</div>
                    <div class="ux4g-date-picker-weekday">We</div>
                    <div class="ux4g-date-picker-weekday">Th</div>
                    <div class="ux4g-date-picker-weekday">Fr</div>
                    <div class="ux4g-date-picker-weekday">Sa</div>
                    <div class="ux4g-date-picker-weekday">Su</div>
                </div>
                <div class="ux4g-date-picker-grid"></div>
            `;
            
            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = calendarHtml;
            this.calendarGrid = calendarContainer.querySelector('.ux4g-date-picker-grid');

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            let html = '';
            for (let i = startDay - 1; i >= 0; i--) {
                html += `<div class="ux4g-date-picker-day is-muted">${prevMonthLastDay - i}</div>`;
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(year, month, i);
                const isToday = date.toDateString() === this.currentDate.toDateString();
                const isSelected = this.tempSelectedDate && date.toDateString() === this.tempSelectedDate.toDateString();
                
                let classes = 'ux4g-date-picker-day';
                if (isToday) classes += ' is-today';
                if (isSelected) classes += ' is-selected';
                
                html += `<div class="${classes}" data-date="${i}" tabindex="0">${i}</div>`;
            }
            
            const totalCells = 42;
            const remainingCells = totalCells - (startDay + daysInMonth);
            for (let i = 1; i <= remainingCells; i++) {
                html += `<div class="ux4g-date-picker-day is-muted">${i}</div>`;
            }
            
            this.calendarGrid.innerHTML = html;
            this.calendarGrid.querySelectorAll('.ux4g-date-picker-day:not(.is-muted)').forEach(dayEl => {
                makeKeyboardClickable(dayEl);
                dayEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const day = e.target.dataset.date;
                    this.selectDate(new Date(year, month, day));
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Confirm';
                this.confirmBtn.disabled = !this.tempSelectedDate;
            }
        }

        renderYearMonthSelection() {
            const currentYear = this.viewDate.getFullYear();
            const startYear = Math.floor(currentYear / 8) * 8;
            const endYear = startYear + 7;
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${startYear}-${endYear} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            let html = '<div class="ux4g-date-picker-selection-view">';
            html += '<div class="ux4g-date-picker-year-grid">';
            for (let y = startYear; y <= endYear; y++) {
                const isSelected = y === this.viewDate.getFullYear();
                html += `<div class="ux4g-date-picker-year-item ${isSelected ? 'is-selected' : ''}" data-year="${y}" tabindex="0">${y}</div>`;
            }
            html += '</div>';

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            html += '<div class="ux4g-date-picker-month-grid">';
            monthNamesShort.forEach((m, i) => {
                const isSelected = i === this.viewDate.getMonth();
                html += `<div class="ux4g-date-picker-month-item ${isSelected ? 'is-selected' : ''}" data-month="${i}" tabindex="0">${m}</div>`;
            });
            html += '</div></div>';

            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = html;

            calendarContainer.querySelectorAll('.ux4g-date-picker-year-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setFullYear(parseInt(e.target.dataset.year));
                    this.renderYearMonthSelection();
                    setTimeout(() => {
                        const selectedMonth = this.container.querySelector('.ux4g-date-picker-month-item.is-selected');
                        if (selectedMonth) selectedMonth.focus();
                    }, 0);
                });
            });

            calendarContainer.querySelectorAll('.ux4g-date-picker-month-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setMonth(parseInt(e.target.dataset.month));
                    this.renderYearMonthSelection();
                    if (this.confirmBtn) setTimeout(() => this.confirmBtn.focus(), 0);
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Select date';
                this.confirmBtn.disabled = false;
            }
        }

        selectDate(date) {
            this.tempSelectedDate = date;
            this.render();
            if (this.confirmBtn && !this.confirmBtn.disabled) {
                setTimeout(() => this.confirmBtn.focus(), 0);
            }
        }
    }

    class RangeDatePicker {
        constructor(container) {
            this.container = container;
            this.inputs = container.querySelectorAll('.ux4g-date-picker-input');
            this.dropdown = container.querySelector('.ux4g-date-picker-dropdown');
            this.calendarGrid = container.querySelector('.ux4g-date-picker-grid');
            this.monthLabel = container.querySelector('.ux4g-date-picker-current');
            
            const navBtns = container.querySelectorAll('.ux4g-date-picker-nav-btn');
            this.prevBtn = navBtns[0];
            this.nextBtn = navBtns[1];
            
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');
            
            this.currentDate = new Date();
            this.viewDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
            this.startDate = null;
            this.endDate = null;
            this.tempStartDate = null;
            this.tempEndDate = null;
            this.selectingEnd = false;
            this.isSelectingYearMonth = false;
            
            this._init();
        }

        _init() {
            if (!this.inputs.length || !this.dropdown) return;

            this.inputs.forEach(input => {
                // Keyboard accessibility
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.open();
                    }
                });

                input.addEventListener('focus', (e) => {
                    this.open();
                });

                input.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.open();
                });
            });
            
            if (this.prevBtn) {
                makeKeyboardClickable(this.prevBtn);
                this.prevBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(-8);
                    } else {
                        this.changeMonth(-1);
                    }
                });
            }
            
            if (this.nextBtn) {
                makeKeyboardClickable(this.nextBtn);
                this.nextBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.changeYearRange(8);
                    } else {
                        this.changeMonth(1);
                    }
                });
            }

            if (this.monthLabel) {
                makeKeyboardClickable(this.monthLabel);
                this.monthLabel.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.isSelectingYearMonth = !this.isSelectingYearMonth;
                    this.render();
                    setTimeout(() => {
                        if (this.isSelectingYearMonth) {
                            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
                            let el = calendarContainer.querySelector('.ux4g-date-picker-year-item.is-selected') || calendarContainer.querySelector('.ux4g-date-picker-year-item');
                            if (el) el.focus();
                        } else {
                            let el = this.calendarGrid.querySelector('.is-range-start') || this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }
                    }, 0);
                });
            }

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.isSelectingYearMonth) {
                        this.isSelectingYearMonth = false;
                        this.render();
                        setTimeout(() => {
                            let el = this.calendarGrid.querySelector('.is-range-start') || this.calendarGrid.querySelector('.is-selected') || this.calendarGrid.querySelector('.is-today') || this.calendarGrid.querySelector('.ux4g-date-picker-day:not(.is-muted)');
                            if (el) el.focus();
                        }, 0);
                    } else {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.cancelSelection();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            getBackdrop().addEventListener('click', () => {
                this.close();
            });

            this.render();
        }

        open() {
            if (this.dropdown) {
                this.tempStartDate = this.startDate ? new Date(this.startDate) : null;
                this.tempEndDate = this.endDate ? new Date(this.endDate) : null;
                this.selectingEnd = this.tempStartDate && !this.tempEndDate;
                this.isSelectingYearMonth = false;
                this.dropdown.classList.add('is-open');
                if (isMobile()) {
                    getBackdrop().classList.add('is-active');
                    document.body.style.overflow = 'hidden';
                }
                this.render();
            }
        }

        close() {
            if (this.dropdown) {
                this.dropdown.classList.remove('is-open');
                getBackdrop().classList.remove('is-active');
                document.body.style.overflow = '';
            }
        }

        confirmSelection() {
            this.startDate = this.tempStartDate ? new Date(this.tempStartDate) : null;
            this.endDate = this.tempEndDate ? new Date(this.tempEndDate) : null;
            this.updateInputs();
            this.close();
        }

        cancelSelection() {
            this.tempStartDate = this.startDate ? new Date(this.tempStartDate) : null;
            this.tempEndDate = this.endDate ? new Date(this.endDate) : null;
            this.close();
        }

        changeMonth(delta) {
            this.viewDate.setMonth(this.viewDate.getMonth() + delta);
            this.render();
        }

        changeYearRange(delta) {
            this.viewDate.setFullYear(this.viewDate.getFullYear() + delta);
            this.render();
        }

        render() {
            if (this.isSelectingYearMonth) {
                this.renderYearMonthSelection();
            } else {
                this.renderCalendar();
            }
        }

        renderCalendar() {
            const year = this.viewDate.getFullYear();
            const month = this.viewDate.getMonth();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${monthNames[month]} ${year} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            const calendarHtml = `
                <div class="ux4g-date-picker-weekdays">
                    <div class="ux4g-date-picker-weekday">Mo</div>
                    <div class="ux4g-date-picker-weekday">Tu</div>
                    <div class="ux4g-date-picker-weekday">We</div>
                    <div class="ux4g-date-picker-weekday">Th</div>
                    <div class="ux4g-date-picker-weekday">Fr</div>
                    <div class="ux4g-date-picker-weekday">Sa</div>
                    <div class="ux4g-date-picker-weekday">Su</div>
                </div>
                <div class="ux4g-date-picker-grid"></div>
            `;
            
            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = calendarHtml;
            this.calendarGrid = calendarContainer.querySelector('.ux4g-date-picker-grid');

            const firstDayOfMonth = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
            const prevMonthLastDay = new Date(year, month, 0).getDate();
            
            let html = '';
            for (let i = startDay - 1; i >= 0; i--) {
                html += `<div class="ux4g-date-picker-day is-muted">${prevMonthLastDay - i}</div>`;
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const date = new Date(year, month, i);
                const isToday = date.toDateString() === this.currentDate.toDateString();
                
                let classes = 'ux4g-date-picker-day';
                if (isToday) classes += ' is-today';
                
                if (this.tempStartDate && date.toDateString() === this.tempStartDate.toDateString()) {
                    classes += ' is-selected is-range-start';
                } else if (this.tempEndDate && date.toDateString() === this.tempEndDate.toDateString()) {
                    classes += ' is-selected is-range-end';
                } else if (this.tempStartDate && this.tempEndDate && date > this.tempStartDate && date < this.tempEndDate) {
                    classes += ' is-in-range';
                }
                
                html += `<div class="${classes}" data-date="${i}" tabindex="0">${i}</div>`;
            }
            
            const totalCells = 42;
            const remainingCells = totalCells - (startDay + daysInMonth);
            for (let i = 1; i <= remainingCells; i++) {
                html += `<div class="ux4g-date-picker-day is-muted">${i}</div>`;
            }
            
            this.calendarGrid.innerHTML = html;
            this.calendarGrid.querySelectorAll('.ux4g-date-picker-day:not(.is-muted)').forEach(dayEl => {
                makeKeyboardClickable(dayEl);
                dayEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const day = e.target.dataset.date;
                    this.handleDateSelection(new Date(year, month, day));
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Confirm';
                this.confirmBtn.disabled = !this.tempStartDate || !this.tempEndDate;
            }
        }

        renderYearMonthSelection() {
            const currentYear = this.viewDate.getFullYear();
            const startYear = Math.floor(currentYear / 8) * 8;
            const endYear = startYear + 7;
            
            if (this.monthLabel) {
                this.monthLabel.innerHTML = `${startYear}-${endYear} <span class="ux4g-icon-outlined ux4g-fs-18">keyboard_arrow_down</span>`;
            }

            let html = '<div class="ux4g-date-picker-selection-view">';
            html += '<div class="ux4g-date-picker-year-grid">';
            for (let y = startYear; y <= endYear; y++) {
                const isSelected = y === this.viewDate.getFullYear();
                html += `<div class="ux4g-date-picker-year-item ${isSelected ? 'is-selected' : ''}" data-year="${y}" tabindex="0">${y}</div>`;
            }
            html += '</div>';

            const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            html += '<div class="ux4g-date-picker-month-grid">';
            monthNamesShort.forEach((m, i) => {
                const isSelected = i === this.viewDate.getMonth();
                html += `<div class="ux4g-date-picker-month-item ${isSelected ? 'is-selected' : ''}" data-month="${i}" tabindex="0">${m}</div>`;
            });
            html += '</div></div>';

            const calendarContainer = this.container.querySelector('.ux4g-date-picker-calendar');
            calendarContainer.innerHTML = html;

            calendarContainer.querySelectorAll('.ux4g-date-picker-year-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setFullYear(parseInt(e.target.dataset.year));
                    this.renderYearMonthSelection();
                    setTimeout(() => {
                        const selectedMonth = this.container.querySelector('.ux4g-date-picker-month-item.is-selected');
                        if (selectedMonth) selectedMonth.focus();
                    }, 0);
                });
            });

            calendarContainer.querySelectorAll('.ux4g-date-picker-month-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.viewDate.setMonth(parseInt(e.target.dataset.month));
                    this.renderYearMonthSelection();
                    if (this.confirmBtn) setTimeout(() => this.confirmBtn.focus(), 0);
                });
            });

            if (this.confirmBtn) {
                this.confirmBtn.innerHTML = 'Select date';
                this.confirmBtn.disabled = false;
            }
        }

        handleDateSelection(date) {
            if (!this.tempStartDate || (this.tempStartDate && this.tempEndDate)) {
                this.tempStartDate = date;
                this.tempEndDate = null;
                this.selectingEnd = true;
            } else if (this.selectingEnd) {
                if (date < this.tempStartDate) {
                    this.tempEndDate = this.tempStartDate;
                    this.tempStartDate = date;
                } else {
                    this.tempEndDate = date;
                }
                this.selectingEnd = false;
            }
            this.render();
            if (!this.selectingEnd && this.confirmBtn && !this.confirmBtn.disabled) {
                setTimeout(() => this.confirmBtn.focus(), 0);
            } else if (this.selectingEnd) {
                setTimeout(() => {
                    const selectedEl = this.calendarGrid.querySelector('.is-range-start');
                    if (selectedEl) selectedEl.focus();
                }, 0);
            }
        }

        updateInputs() {
            if (this.startDate) {
                const d = String(this.startDate.getDate()).padStart(2, '0');
                const m = String(this.startDate.getMonth() + 1).padStart(2, '0');
                const y = this.startDate.getFullYear();
                this.inputs[0].value = `${d}/${m}/${y}`;
            } else {
                this.inputs[0].value = '';
            }
            if (this.endDate) {
                const d = String(this.endDate.getDate()).padStart(2, '0');
                const m = String(this.endDate.getMonth() + 1).padStart(2, '0');
                const y = this.endDate.getFullYear();
                this.inputs[1].value = `${d}/${m}/${y}`;
            } else {
                this.inputs[1].value = '';
            }
        }
    }

    class TimePicker {
        constructor(container) {
            this.container = container;
            this.input = container.querySelector('.ux4g-time-picker-input');
            this.dropdown = container.querySelector('.ux4g-time-picker-dropdown');
            this.hhColumn = container.querySelector('[data-column="hh"]');
            this.mmColumn = container.querySelector('[data-column="mm"]');
            this.ampmBtns = container.querySelectorAll('.ux4g-time-picker-ampm-btn');
            this.confirmBtn = container.querySelector('.ux4g-btn-primary');
            this.cancelBtn = container.querySelector('.ux4g-btn-outline-neutral');

            this.selectedHH = null;
            this.selectedMM = null;
            this.selectedAMPM = "PM";

            this.tempHH = null;
            this.tempMM = null;

            this._init();
        }

        _init() {
            if (!this.input || !this.dropdown) return;

            // Keyboard accessibility
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.open();
                }
            });

            this.input.addEventListener('focus', (e) => {
                this.open();
            });

            this.input.addEventListener('click', (e) => {
                e.stopPropagation();
                this.open();
            });

            this.ampmBtns.forEach(btn => {
                makeKeyboardClickable(btn);
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectedAMPM = e.target.dataset.value;
                    this.updateAMPMUI();
                });
            });

            if (this.confirmBtn) {
                makeKeyboardClickable(this.confirmBtn);
                this.confirmBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (!this.confirmBtn.disabled) {
                        this.confirmSelection();
                    }
                });
            }

            if (this.cancelBtn) {
                makeKeyboardClickable(this.cancelBtn);
                this.cancelBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.close();
                });
            }

            document.addEventListener('click', (e) => {
                if (!this.container.contains(e.target) && !getBackdrop().contains(e.target)) {
                    this.close();
                }
            });

            this.renderColumns();
            this.updateAMPMUI();
            this.validate();
        }

        open() {
            this.tempHH = this.selectedHH;
            this.tempMM = this.selectedMM;
            
            this.dropdown.classList.add('is-open');
            if (isMobile()) {
                getBackdrop().classList.add('is-active');
                document.body.style.overflow = 'hidden';
            }
            
            this.renderColumns();
            this.scrollToSelected();
            this.validate();
        }

        close() {
            this.dropdown.classList.remove('is-open');
            getBackdrop().classList.remove('is-active');
            document.body.style.overflow = '';
        }

        validate() {
            if (this.confirmBtn) {
                this.confirmBtn.disabled = !(this.tempHH && this.tempMM);
            }
        }

        confirmSelection() {
            this.selectedHH = this.tempHH;
            this.selectedMM = this.tempMM;
            this.input.value = `${this.selectedHH} : ${this.selectedMM} ${this.selectedAMPM}`;
            this.close();
        }

        updateAMPMUI() {
            this.ampmBtns.forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.value === this.selectedAMPM);
            });
        }

        renderColumns() {
            // Hours (1-12)
            let hhHtml = '<div class="ux4g-time-picker-col-header">HH</div>';
            for (let i = 1; i <= 12; i++) {
                const val = String(i).padStart(2, '0');
                const isSelected = val === this.tempHH;
                hhHtml += `<div class="ux4g-time-picker-item ${isSelected ? 'is-selected' : ''}" data-value="${val}" tabindex="0">${val}</div>`;
            }
            this.hhColumn.innerHTML = hhHtml;

            // Minutes (0-55, step 5)
            let mmHtml = '<div class="ux4g-time-picker-col-header">MM</div>';
            for (let i = 0; i < 60; i += 5) {
                const val = String(i).padStart(2, '0');
                const isSelected = val === this.tempMM;
                mmHtml += `<div class="ux4g-time-picker-item ${isSelected ? 'is-selected' : ''}" data-value="${val}" tabindex="0">${val}</div>`;
            }
            this.mmColumn.innerHTML = mmHtml;

            // Click events
            this.hhColumn.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.tempHH = e.target.dataset.value;
                    this.updateColumnSelection(this.hhColumn, this.tempHH);
                    this.validate();
                    if (!this.confirmBtn.disabled) {
                        setTimeout(() => this.confirmBtn.focus(), 0);
                    } else if (!this.tempMM) {
                        const firstMM = this.mmColumn.querySelector('.ux4g-time-picker-item');
                        if (firstMM) setTimeout(() => firstMM.focus(), 0);
                    }
                });
            });

            this.mmColumn.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                makeKeyboardClickable(el);
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.tempMM = e.target.dataset.value;
                    this.updateColumnSelection(this.mmColumn, this.tempMM);
                    this.validate();
                    if (!this.confirmBtn.disabled) {
                        setTimeout(() => this.confirmBtn.focus(), 0);
                    }
                });
            });
        }

        updateColumnSelection(column, value) {
            column.querySelectorAll('.ux4g-time-picker-item').forEach(el => {
                el.classList.toggle('is-selected', el.dataset.value === value);
            });
        }

        scrollToSelected() {
            const columns = [this.hhColumn, this.mmColumn];
            columns.forEach(col => {
                const selected = col.querySelector('.is-selected');
                if (selected) {
                    col.scrollTop = selected.offsetTop - col.offsetTop - 80;
                }
            });
        }
    }

    const init = () => {
        document.querySelectorAll('.ux4g-date-picker-container').forEach(container => {
            if (!container.closest('.ux4g-date-range-picker')) new DatePicker(container);
        });
        document.querySelectorAll('.ux4g-date-range-picker').forEach(container => {
            new RangeDatePicker(container);
        });
        document.querySelectorAll('.ux4g-time-picker-container').forEach(container => {
            new TimePicker(container);
        });
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    global.DatePicker = DatePicker;
    global.RangeDatePicker = RangeDatePicker;
    global.TimePicker = TimePicker;

})(window);


/********************************* Time Slot JS ***********************************/ 

class TimeSlotCalendar {
    constructor(container) {
        this.container = container;
        this.calendarGrid = container.querySelector('.ux4g-time-slot-compact-grid');
        this.monthLabel = container.querySelector('.ux4g-time-slot-compact-month');
        this.slotTitle = container.querySelector('.ux4g-time-slot-compact-desktop-header');
        this.slotsList = container.querySelector('.ux4g-time-slot-compact-list');
        this.confirmBtn = container.querySelector('.ux4g-btn-primary');
        
        const navBtns = container.querySelectorAll('.ux4g-btn-icon');
        this.prevBtn = navBtns[0];
        this.nextBtn = navBtns[1];

        this.currentDate = new Date();
        this.viewDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        this.selectedDate = new Date(2026, 3, 23); // Default from design: April 23, 2026

        // Mock Data for Statuses
        this.holidays = ['2026-04-09', '2026-04-21'];
        this.weeklyOffs = [0, 6]; // Sunday, Saturday
        this.noSlotsDates = ['2026-04-08', '2026-04-13'];

        this._init();
    }

    _init() {
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.changeMonth(-1));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.changeMonth(1));
        }

        // Cancel Button Reset Logic
        const cancelBtn = this.container.querySelector('.ux4g-btn-outline-neutral');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.selectedDate = null; // Reset selection
                this.render(); // Re-render calendar to clear highlights
                if (this.slotTitle) this.slotTitle.innerText = "Select a Date"; // Reset slot header
                this.resetSlots(); // Clear slot selection and disable confirm button
            });
        }

        this.render();
    }

    changeMonth(delta) {
        this.viewDate.setMonth(this.viewDate.getMonth() + delta);
        this.render();
    }

    render() {
        this.renderCalendar();
    }

    renderCalendar() {
        const year = this.viewDate.getFullYear();
        const month = this.viewDate.getMonth();
        const monthNames = ["January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];

        // Update Month Label
        if (this.monthLabel) {
            this.monthLabel.innerText = `${monthNames[month]} ${year}`;
        }

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Adjust for Monday start
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
        const prevMonthLastDay = new Date(year, month, 0).getDate();

        // Clear and rebuild grid
        this.calendarGrid.innerHTML = '';

        // Add Weekday Names
        const days = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
        days.forEach(day => {
            const dayEl = document.createElement('div');
            dayEl.className = 'ux4g-time-slot-day-name';
            dayEl.innerText = day;
            this.calendarGrid.appendChild(dayEl);
        });

        // Previous Month Days
        for (let i = startDay - 1; i >= 0; i--) {
            const dateEl = document.createElement('div');
            dateEl.className = 'ux4g-time-slot-date muted';
            dateEl.innerText = prevMonthLastDay - i;
            this.calendarGrid.appendChild(dateEl);
        }

        // Current Month Days
        for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
            const isToday = date.toDateString() === this.currentDate.toDateString();
            const isSelected = this.selectedDate && date.toDateString() === this.selectedDate.toDateString();
            const isHoliday = this.holidays.includes(dateStr);
            const isWeeklyOff = this.weeklyOffs.includes(date.getDay());
            const isNoSlots = this.noSlotsDates.includes(dateStr);

            const dateEl = document.createElement('div');
            dateEl.className = 'ux4g-time-slot-date';
            if (isToday) dateEl.classList.add('today');
            if (isSelected) dateEl.classList.add('selected');
            if (isHoliday) dateEl.classList.add('holiday');
            if (isWeeklyOff) dateEl.classList.add('weekly-off');
            if (isNoSlots) dateEl.classList.add('no-slots');
            
            dateEl.innerText = i;
            dateEl.dataset.date = i;

            dateEl.addEventListener('click', () => {
                this.selectedDate = new Date(year, month, i);
                this.render();
                this.updateSlotHeader();
                this.resetSlots();
            });

            this.calendarGrid.appendChild(dateEl);
        }

        // Next Month Days
        const totalCells = 42 + 7; // Including header row
        const currentCells = this.calendarGrid.children.length;
        const remainingCells = totalCells - currentCells;
        for (let i = 1; i <= remainingCells; i++) {
            const dateEl = document.createElement('div');
            dateEl.className = 'ux4g-time-slot-date muted';
            dateEl.innerText = i;
            this.calendarGrid.appendChild(dateEl);
        }
    }

    updateSlotHeader() {
        if (this.slotTitle && this.selectedDate) {
            const day = this.selectedDate.getDate();
            const monthNames = ["January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const month = monthNames[this.selectedDate.getMonth()];
            const year = this.selectedDate.getFullYear();
            this.slotTitle.innerText = `${day}${this.getOrdinal(day)} ${month} ${year}`;
        }
    }

    resetSlots() {
        // Reset slot selection and disable confirm button
        const slots = this.container.querySelectorAll('.ux4g-time-slot-compact-slot-item:not(.disabled)');
        slots.forEach(s => s.style.backgroundColor = 'transparent');
        if (this.confirmBtn) this.confirmBtn.setAttribute('disabled', 'true');
        
        // Re-attach slot selection listeners
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                slots.forEach(s => s.style.backgroundColor = 'transparent');
                slot.style.backgroundColor = 'var(--ux4g-bg-neutral-subtle)';
                if (this.confirmBtn) this.confirmBtn.removeAttribute('disabled');
            });
        });
    }

    getOrdinal(n) {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return (s[(v - 20) % 10] || s[v] || s[0]);
    }
}

// Initialize on Load
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Compact Calendar
    const compactContainer = document.querySelector('.ux4g-time-slot-compact-container');
    if (compactContainer) {
        new TimeSlotCalendar(compactContainer);
    }

    // Initialize Weekly Grid Selection
    const weeklyGrid = document.querySelector('.ux4g-time-slot-weekly-grid');
    if (weeklyGrid) {
        const cells = weeklyGrid.querySelectorAll('.ux4g-time-slot-cell.available, .ux4g-time-slot-cell.limited');
        const confirmBtn = weeklyGrid.parentElement.querySelector('.ux4g-time-slot-weekly-actions .ux4g-btn-primary');
        const cancelBtn = weeklyGrid.parentElement.querySelector('.ux4g-time-slot-weekly-actions .ux4g-btn-outline-neutral');

        cells.forEach(cell => {
            // Store original content to restore later
            const originalHTML = cell.innerHTML;

            cell.addEventListener('click', () => {
                if (cell.classList.contains('selected')) return;

                // 1. Restore all other cells to their original state
                cells.forEach(c => {
                    if (c.classList.contains('selected')) {
                        c.classList.remove('selected');
                        if (c._originalContent) {
                            c.innerHTML = c._originalContent;
                        }
                    }
                });

                // 2. Select this cell
                cell.classList.add('selected');
                cell._originalContent = originalHTML;
                cell.innerHTML = `<span class="ux4g-icon-filled">check_circle</span> Selected`;

                // 3. Enable Confirm Button
                if (confirmBtn) confirmBtn.removeAttribute('disabled');
            });
        });

        // Cancel Button logic for Weekly Grid
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                cells.forEach(c => {
                    if (c.classList.contains('selected')) {
                        c.classList.remove('selected');
                        if (c._originalContent) {
                            c.innerHTML = c._originalContent;
                        }
                    }
                });
                if (confirmBtn) confirmBtn.setAttribute('disabled', 'true');
            });
        }
    }

    // Initialize Weekly Grid Mobile Navigation (Dynamic approach)
    const mobileNav = document.querySelector('.ux4g-time-slot-mobile-nav');
    if (weeklyGrid && mobileNav) {
        const mobileDateLabel = mobileNav.querySelector('.ux4g-time-slot-mobile-date');
        const navBtns = mobileNav.querySelectorAll('.ux4g-btn-icon');
        const prevBtn = navBtns[0];
        const nextBtn = navBtns[1];

        // 1. Dynamically assign data-day attributes to cells based on grid position
        // Grid has 8 columns: Time, Mon, Tue, Wed, Thu, Fri, Sat, Sun
        const children = weeklyGrid.children;
        for (let i = 0; i < children.length; i++) {
            const colIndex = i % 8;
            if (colIndex > 0) { // Skip Time column
                children[i].setAttribute('data-day', colIndex - 1);
            }
        }

        // 2. Navigation Logic
        let activeDay = 0;
        weeklyGrid.setAttribute('data-active-day', activeDay);

        const daysData = [
            { day: "Mon 14 Apr", status: "Today" },
            { day: "Tue 15 Apr", status: "" },
            { day: "Wed 16 Apr", status: "" },
            { day: "Thu 17 Apr", status: "Public Holiday" },
            { day: "Fri 18 Apr", status: "" },
            { day: "Sat 19 Apr", status: "Weekly off" },
            { day: "Sun 20 Apr", status: "Weekly off" }
        ];

        const updateMobileNav = (index) => {
            weeklyGrid.setAttribute('data-active-day', index);
            const data = daysData[index];
            if (mobileDateLabel) {
                mobileDateLabel.innerHTML = `
                    <strong>${data.day}</strong>
                    ${data.status ? `<span class="${data.status === 'Today' ? 'ux4g-text-success-600' : 'ux4g-text-neutral-secondary'}">${data.status}</span>` : ''}
                `;
            }
        };

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                activeDay = (activeDay > 0) ? activeDay - 1 : 6;
                updateMobileNav(activeDay);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                activeDay = (activeDay < 6) ? activeDay + 1 : 0;
                updateMobileNav(activeDay);
            });
        }
    }
});


/********************************* Result list JS ***********************************/ 

// Accordion Toggle
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtns = document.querySelectorAll('.ux4g-result-list-accordion-toggle');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const toggle = e.target;
            const card = toggle.closest('.ux4g-result-list');
            const content = card.querySelector('.ux4g-result-list-content');
            if (!content) return;
            
            const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                toggle.setAttribute('aria-expanded', 'false');
                toggle.innerText = 'expand_more';
            } else {
                toggle.setAttribute('aria-expanded', 'true');
                toggle.innerText = 'expand_less';
            }
        });
    });
});
