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
      option.classList.toggle("is-selected", isSelected);
      option.classList.toggle("active", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
      option.setAttribute("aria-pressed", String(isSelected));
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
        const isAlreadySelected = choice.classList.contains("is-selected") || choice.classList.contains("active");
        if (isAlreadySelected) {
          setSingleSelectedOption(dropdown, null);
          applySingleSelection(dropdown, "");
        } else {
          setSingleSelectedOption(dropdown, choice);
          applySingleSelection(dropdown, value);
        }
      } else if (!isMulti) {
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


