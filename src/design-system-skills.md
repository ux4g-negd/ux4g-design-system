# Design System Skills & Instructions (UX4G)

## 1. Overview
This project uses a custom design system characterized by the `ux4g-` prefix for all classes. It provides a comprehensive set of UI components, utility classes for layout/typography/spacing, and semantic tokens for theming.

**Core Philosophy:** 
- Utility-first principles paired with robust pre-built component classes.
- High emphasis on accessibility (ARIA attributes, roles).
- No external CSS frameworks (Tailwind, Bootstrap) are allowed.

## 2. Strict Implementation Rules (Master Rules)
1. **NO EXTERNAL FRAMEWORKS:** Never use Tailwind CSS, Bootstrap, or any other external framework classes.
2. **PREFIX MANDATORY:** Only use classes found in the local `/src/components` directory. All valid classes start with the `ux4g-` prefix (with rare exceptions like `.india-flag` or `.acc-top-divider` found in specific domains, but `ux4g-` must be the default).
3. **ACCESSIBILITY FIRST:** Always reference the structure found in `index.html` for accessibility and layout. Use appropriate `aria-label`, `aria-hidden`, `role`, `tabindex`, and visually hidden spans where necessary.
4. **SEMANTIC HTML:** Use semantic HTML tags (`<header>`, `<nav>`, `<section>`, `<button>`) alongside the design system's classes.
5. **ICONS:** Use `<span class="ux4g-icon-outlined">icon_name</span>` or `<i class="ux4g-icon-outlined">icon_name</i>` for rendering Material Icons.

## 3. Utility Classes (Foundations & Layout)
* **Spacing:** `.ux4g-m-*`, `.ux4g-p-*`, `.ux4g-mt-*`, `.ux4g-mb-*`, `.ux4g-py-*`, `.ux4g-px-*` (Sizes: `xs`, `s`, `m`, `l`, `xl`, `2xl`, etc.)
* **Typography:** `.ux4g-ff-base`, `.ux4g-body-m-default`, `.ux4g-label-m-default`, `.ux4g-heading-l-strong`, `.ux4g-title-s-default`, `.ux4g-fs-*` (e.g., `16`, `18`, `20`), `.ux4g-fw-semibold`.
* **Colors & Backgrounds:** `.ux4g-bg-neutral`, `.ux4g-text-neutral-primary`, `.ux4g-text-neutral-secondary`, `.ux4g-text-warning`, etc.
* **Flexbox:** `.ux4g-d-flex`, `.ux4g-d-inline-flex`, `.ux4g-jc-center`, `.ux4g-jc-between`, `.ux4g-ai-center`, `.ux4g-flex-col`.
* **Grid Layouts:** `.ux4g-container`, `.ux4g-container-fluid`, `.ux4g-row`, `.ux4g-col-md-*` (1-12), `.ux4g-gutter-*`, `.ux4g-d-grid`, `.ux4g-grid-auto-fit-250`.
* **Responsive:** `.ux4g-md-d-flex`, `.ux4g-d-none` (e.g., `ux4g-d-none ux4g-md-d-flex`).
* **Other:** `.ux4g-z-1`, `.ux4g-relative`.

## 4. Component Catalog & Structures

### 4.1 Buttons
Buttons have multiple variants and sizes (`xs`, `sm`, `md`, `lg`, `xl`).
**Variants:** Primary, Danger
**Styles:** Solid (`ux4g-btn-primary`), Outline (`ux4g-btn-outline-primary`), Text (`ux4g-btn-text-primary`), Tonal (`ux4g-btn-tonal-primary`).
```html
<button class="ux4g-btn-primary ux4g-btn-md">Button Text</button>
<button class="ux4g-btn-outline-danger ux4g-btn-sm">Danger Outline</button>
```

### 4.2 Slider (Single & Dual/Range)
**Classes:** `.ux4g-slider-field`, `.ux4g-slider-sm` | `.ux4g-slider-md`, `.ux4g-slider`
**Structure:** Contains a label row, the track/input, and a description.
```html
<div class="ux4g-slider-field ux4g-slider-sm">
    <div class="ux4g-slider-label-row">
        <label class="ux4g-slider-label">Label <span class="ux4g-slider-label-required">*</span></label>
        <span class="ux4g-slider-value-badge">40%</span>
    </div>
    <div class="ux4g-slider ux4g-slider-sm">
        <input type="range" class="ux4g-slider-input" min="0" max="100" step="10" value="40">
        <div class="ux4g-slider-track">
            <div class="ux4g-slider-fill"></div>
            <div class="ux4g-slider-thumb"></div>
        </div>
        <div class="ux4g-slider-steps"></div>
    </div>
    <span class="ux4g-slider-description">Description</span>
</div>
```

### 4.3 Tabs (Horizontal & Vertical)
**Types:** Underline (`.ux4g-tab-underline`), Pill (`.ux4g-tab-pill`).
**Layout:** Horizontal (default) or Vertical (`.ux4g-tab-vertical`).
**Sizes:** `sm`, `md`, `lg`.
**Structure:** Requires a `ul` with `.ux4g-tab-list` and panels `.ux4g-tab-panel`. Active states use `.is-active`.
```html
<div class="ux4g-tab ux4g-tab-underline ux4g-tab-md" data-ux4g-tab>
    <ul class="ux4g-tab-list" role="tablist">
        <li class="ux4g-tab-item is-active" role="tab" tabindex="0" data-panel="dp1">Overview</li>
        <li class="ux4g-tab-item" role="tab" tabindex="-1" data-panel="dp2">Details</li>
    </ul>
    <div class="ux4g-tab-panel is-active" id="dp1">Overview Content</div>
    <div class="ux4g-tab-panel" id="dp2">Details Content</div>
</div>
```

### 4.4 Tooltips
Pure CSS tooltips that require a wrapper.
**Classes:** `.ux4g-tooltip-wrapper`, `.ux4g-tooltip`, positions (`-top-left`, `-bottom-center`, etc.), sizes (`-s`, `-xs`).
```html
<div class="ux4g-tooltip-wrapper">
    <button class="ux4g-btn-primary">Hover me</button>
    <div class="ux4g-tooltip ux4g-tooltip-top-center ux4g-tooltip-s">
        <i class="ux4g-icon-outlined">info</i> Tooltip text here.
    </div>
</div>
```

### 4.5 Search Inputs
**Classes:** `.ux4g-search-container`, `.ux4g-search`, `.ux4g-search-input`, `.ux4g-search-actions`, `.ux4g-search-btn`. Sizes: `s`, `m`, `lg`.
```html
<div class="ux4g-search-container ux4g-search-m">
    <label class="ux4g-label-m-default">Search</label>
    <div class="ux4g-search">
        <span class="ux4g-icon-outlined ux4g-search-leading-icon">search</span>
        <input class="ux4g-search-input" placeholder="Search for..." type="text" />
        <div class="ux4g-search-actions">
            <button class="ux4g-search-action-btn ux4g-search-clear" type="button">
                <span class="ux4g-icon-outlined">close</span>
            </button>
        </div>
        <button class="ux4g-search-btn" type="submit">
            <span class="ux4g-icon-outlined">search</span>
        </button>
    </div>
</div>
```

### 4.6 Combobox (Select/Dropdown)
**Classes:** `.ux4g-combobox`, `.ux4g-combobox-single`, `.ux4g-combobox-control`, `.ux4g-combobox-menu`. Includes support for validation classes like `.ux4g-combobox-error`, `.ux4g-combobox-success`, `.ux4g-combobox-warning`.
```html
<div class="ux4g-combobox ux4g-combobox-default ux4g-combobox-single ux4g-combobox-md">
    <button aria-label="Select option" class="ux4g-combobox-control" type="button">
        <span class="ux4g-combobox-value">
            <input class="ux4g-combobox-input" placeholder="Start typing.." type="text" />
        </span>
        <span aria-hidden="true" class="ux4g-icon-outlined ux4g-combobox-caret">expand_more</span>
    </button>
    <div class="ux4g-combobox-menu" role="listbox">
        <ul class="ux4g-list ux4g-list-default ux4g-list-m">
            <li class="ux4g-list-item" role="option">
                <button class="ux4g-list-item-row ux4g-combobox-single-option" type="button" ux4g-combobox-choice="Option 1">
                    <span class="ux4g-list-item-start">Option 1</span>
                    <span aria-hidden="true" class="ux4g-list-item-end ux4g-icon-outlined ux4g-combobox-single-check">check</span>
                </button>
            </li>
        </ul>
    </div>
</div>
```

### 4.7 Lists
Used independently or within Dropdowns/Combobox/Search.
**Classes:** `.ux4g-list`, `.ux4g-list-default`, `.ux4g-list-item`, `.ux4g-list-item-row`, `.ux4g-list-item-start`. Sizes: `s`, `m`, `l`.
```html
<ul class="ux4g-list ux4g-list-default ux4g-list-m">
    <li class="ux4g-list-item">
        <button class="ux4g-list-item-row">
            <span class="ux4g-list-item-start">Item Text</span>
        </button>
    </li>
</ul>
```

### 4.8 Topbar
**Classes:** `.ux4g-topbar`, `.ux4g-topbar__wrap`, `.ux4g-topbar__skip`, `.ux4g-topbar__group`, `.ux4g-topbar__iconbtn`.
Structure extensively utilizes grid and flex layouts for responsive rendering.

## 5. Implementation Readiness
I have thoroughly analyzed the components, utility classes, and accessibility structures. I am fully prepared to generate and implement any frontend structures using strictly the `ux4g-` ecosystem of components without relying on external libraries.
