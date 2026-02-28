import { defaultTheme } from "./themes.js";
import { icons } from "./icons.js";

/**
 * Default CSS injected once when the default theme is used.
 * Avoids the need for users to ship a separate .css file.
 */
const DEFAULT_CSS = `
.filtered-select-multiple {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  flex-wrap: wrap;
}
.fsm-column {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 220px;
  flex: 1 1 220px;
}
.fsm-label {
  font-weight: 600;
}
.fsm-counter {
  font-size: 0.85em;
  opacity: 0.7;
  font-weight: normal;
}
.fsm-filter {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid #d0d6e0;
}
.fsm-select {
  min-width: 220px;
  padding: 0.25rem;
  border-radius: 6px;
  border: 1px solid #d0d6e0;
  background: #fff;
  flex: 1 1 auto;
}
.fsm-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  justify-content: center;
}
.fsm-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: none;
  background: #0052cc;
  color: #fff;
  cursor: pointer;
  transition: background 0.2s ease-in-out;
  white-space: nowrap;
}
.fsm-button svg {
  height: 1.2em;
  width: auto;
  flex-shrink: 0;
}
.fsm-button:disabled,
.fsm-button-disabled {
  cursor: not-allowed;
  background: #cbd5f5;
  color: #49526f;
}
.fsm-button:not(:disabled):hover {
  background: #0a66e6;
}
.fsm-add-all,
.fsm-add-selected {
  justify-content: flex-end;
}
.fsm-remove-selected,
.fsm-remove-all {
  justify-content: flex-start;
}
@media (max-width: 640px) {
  .filtered-select-multiple {
    flex-direction: column;
    align-items: stretch;
  }
  .fsm-controls {
    flex-direction: row;
    justify-content: center;
  }
}
`;

let defaultCssInjected = false;

function injectDefaultCSS(doc) {
  if (defaultCssInjected) return;
  const style = doc.createElement("style");
  style.setAttribute("data-fsm-default-theme", "");
  style.textContent = DEFAULT_CSS;
  doc.head.appendChild(style);
  defaultCssInjected = true;
}

/**
 * Transform a native <select multiple> element into a dual-list transfer widget.
 *
 * Usage:
 *   import { FilteredSelectMultiple } from "filtered-select-multiple-widget";
 *   const widget = new FilteredSelectMultiple(selectElement, options);
 */
export class FilteredSelectMultiple {
  /** @type {AbortController} – used to clean up all event listeners on destroy */
  #abortController = new AbortController();

  constructor(selectElement, options = {}) {
    if (!(selectElement instanceof HTMLSelectElement) || !selectElement.multiple) {
      throw new Error("FilteredSelectMultiple requires a <select multiple> element");
    }

    this.selectElement = selectElement;
    this.doc = selectElement.ownerDocument;

    // Merge the provided theme on top of defaults so missing keys are filled.
    this.theme = { ...defaultTheme, ...(options.theme ?? {}) };

    // Always inject default CSS — its .fsm-* selectors won't collide with
    // framework themes that use their own class names.
    injectDefaultCSS(this.doc);

    const optionCount = selectElement.options.length;
    this.showFilter = options.showFilter ?? true;
    this.filterMatchMode = options.filterMatchMode ?? "contains";
    this.size = options.size ?? (selectElement.size || Math.min(Math.max(optionCount, 4), 12));
    this.preserveSelectionOrder = options.preserveSelectionOrder ?? false;

    // Text / labels
    const textDefaults = {
      availableLabel: "Available",
      chosenLabel: "Chosen",
      filterPlaceholder: "Filter",
      addAll: "Add all",
      addSelected: "Add selected",
      removeSelected: "Remove selected",
      removeAll: "Remove all",
    };
    this.text = { ...textDefaults, ...(options.text || {}) };

    // Auto-detect labels from an associated <label> element
    if (
      this.text.availableLabel === textDefaults.availableLabel &&
      this.text.chosenLabel === textDefaults.chosenLabel
    ) {
      const label = this.doc.querySelector(`label[for="${selectElement.id}"]`);
      if (label) {
        const baseLabel = label.textContent.trim();
        this.text.availableLabel = `Available ${baseLabel}`;
        this.text.chosenLabel = `Chosen ${baseLabel}`;
      }
    }

    const fallbackFilter = options.text?.filterPlaceholder ?? textDefaults.filterPlaceholder;
    this.text.availableFilterPlaceholder = this.text.availableFilterPlaceholder ?? fallbackFilter;
    this.text.chosenFilterPlaceholder = this.text.chosenFilterPlaceholder ?? fallbackFilter;

    // Internal state
    this.options = new Map();
    this.available = [];
    this.chosen = [];

    // UI element references
    this.container = null;
    this.availableSelect = null;
    this.chosenSelect = null;
    this.availableFilter = null;
    this.chosenFilter = null;
    this.availableCounter = null;
    this.chosenCounter = null;
    this.buttons = {};

    // Filter debounce timer ids
    this._filterTimers = { available: 0, chosen: 0 };

    this._init();
  }

  // ---------------------------------------------------------------------------
  // Initialisation
  // ---------------------------------------------------------------------------

  _init() {
    this._buildState();
    this.selectElement.dataset.filteredSelectMultiple = "true";
    this.previousDisplay = this.selectElement.style.display;
    this.selectElement.style.display = "none";
    this.placeholder = this.doc.createComment("filtered-select-multiple");
    this.selectElement.parentNode.insertBefore(this.placeholder, this.selectElement);
    this._buildUI();
    this._attachEvents();
    this._render();
  }

  _buildState() {
    const options = Array.from(this.selectElement.options);

    options.forEach((option, index) => {
      const key = `fsm-${index}`;
      this.options.set(key, {
        key,
        index,
        value: option.value,
        label: option.text,
        disabled: option.disabled,
        dataset: { ...option.dataset },
        title: option.title,
        original: option,
      });

      if (option.selected) {
        this.chosen.push(key);
      } else {
        this.available.push(key);
      }
    });

    this._sortByIndex(this.available);
    if (!this.preserveSelectionOrder) {
      this._sortByIndex(this.chosen);
    }
  }

  _sortByIndex(keys) {
    keys.sort((a, b) => {
      const ai = this.options.get(a)?.index ?? Number.MAX_SAFE_INTEGER;
      const bi = this.options.get(b)?.index ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });
  }

  // ---------------------------------------------------------------------------
  // UI construction
  // ---------------------------------------------------------------------------

  _buildUI() {
    this.container = this.doc.createElement("div");
    this.container.className = this.theme.container;

    const availablePane = this._createPane({
      type: "available",
      label: this.text.availableLabel,
      filterPlaceholder: this.text.availableFilterPlaceholder,
    });
    this.availableSelect = availablePane.select;
    this.availableFilter = availablePane.filter;
    this.availableCounter = availablePane.counter;

    const controls = this._createControls();

    const chosenPane = this._createPane({
      type: "chosen",
      label: this.text.chosenLabel,
      filterPlaceholder: this.text.chosenFilterPlaceholder,
    });
    this.chosenSelect = chosenPane.select;
    this.chosenFilter = chosenPane.filter;
    this.chosenCounter = chosenPane.counter;

    this.container.append(availablePane.column, controls, chosenPane.column);
    this.placeholder.parentNode.insertBefore(this.container, this.placeholder);
  }

  _createPane({ type, label, filterPlaceholder }) {
    const column = this.doc.createElement("div");
    const isAvailable = type === "available";
    column.className =
      this.theme.column + " " +
      (isAvailable ? this.theme.availableColumn : this.theme.chosenColumn);

    // Unique ids for aria relationships
    const labelId = `fsm-label-${type}-${Date.now()}`;

    // Label + counter
    const labelEl = this.doc.createElement("div");
    labelEl.className = this.theme.label;
    labelEl.id = labelId;

    const labelText = this.doc.createTextNode(label + " ");
    labelEl.appendChild(labelText);

    const counter = this.doc.createElement("span");
    counter.className = this.theme.counter;
    counter.setAttribute("aria-live", "polite");
    labelEl.appendChild(counter);

    column.appendChild(labelEl);

    // Filter input (optional)
    let filter = null;
    if (this.showFilter) {
      filter = this.doc.createElement("input");
      filter.type = "search";
      filter.className = this.theme.filter;
      filter.placeholder = filterPlaceholder;
      filter.dataset.paneType = type;
      filter.setAttribute("aria-label", `${filterPlaceholder} ${label}`);
      column.appendChild(filter);
    }

    // Select element
    const select = this.doc.createElement("select");
    select.multiple = true;
    select.size = this.size;
    select.className = this.theme.select;
    select.dataset.paneType = type;
    select.setAttribute("aria-labelledby", labelId);
    column.appendChild(select);

    return { column, select, filter, counter };
  }

  _createControls() {
    const column = this.doc.createElement("div");
    column.className = this.theme.controls;
    column.setAttribute("role", "group");
    column.setAttribute("aria-label", "Transfer controls");

    const buttonDefs = [
      { action: "addAll", label: this.text.addAll, icon: icons.addAll },
      { action: "addSelected", label: this.text.addSelected, icon: icons.addSelected },
      { action: "removeSelected", label: this.text.removeSelected, icon: icons.removeSelected },
      { action: "removeAll", label: this.text.removeAll, icon: icons.removeAll },
    ];

    buttonDefs.forEach(({ action, label, icon }) => {
      const button = this.doc.createElement("button");
      button.type = "button";
      const actionKey = `button${action.charAt(0).toUpperCase()}${action.slice(1)}`;
      const actionClass = this.theme[actionKey] || "";
      button.className = (this.theme.button + " " + actionClass).trim();
      button.setAttribute("aria-label", label);

      const isRemove = action.startsWith("remove");
      button.innerHTML = isRemove ? `${icon} ${label}` : `${label} ${icon}`;
      button.dataset.action = action;
      this.buttons[action] = button;
      column.appendChild(button);
    });

    return column;
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  _attachEvents() {
    const signal = this.#abortController.signal;

    if (this.availableFilter) {
      this.availableFilter.addEventListener("input", () => this._debouncedRender("available"), { signal });
    }
    if (this.chosenFilter) {
      this.chosenFilter.addEventListener("input", () => this._debouncedRender("chosen"), { signal });
    }

    this.availableSelect.addEventListener("change", () => this._updateButtons(), { signal });
    this.chosenSelect.addEventListener("change", () => this._updateButtons(), { signal });

    this.availableSelect.addEventListener("dblclick", () => {
      if (!this.availableSelect.disabled) this._moveSelected("available", "chosen");
    }, { signal });
    this.chosenSelect.addEventListener("dblclick", () => {
      if (!this.chosenSelect.disabled) this._moveSelected("chosen", "available");
    }, { signal });

    // Keyboard shortcut: Enter to transfer selected items
    this.availableSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this._moveSelected("available", "chosen"); }
    }, { signal });
    this.chosenSelect.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); this._moveSelected("chosen", "available"); }
    }, { signal });

    Object.entries(this.buttons).forEach(([action, button]) => {
      button.addEventListener("click", () => {
        switch (action) {
          case "addAll": this._moveAll("available", "chosen"); break;
          case "addSelected": this._moveSelected("available", "chosen"); break;
          case "removeSelected": this._moveSelected("chosen", "available"); break;
          case "removeAll": this._moveAll("chosen", "available"); break;
        }
      }, { signal });
    });
  }

  _debouncedRender(type) {
    clearTimeout(this._filterTimers[type]);
    this._filterTimers[type] = setTimeout(() => this._renderPane(type), 120);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  _render() {
    this._renderPane("available");
    this._renderPane("chosen");
    this._updateButtons();
  }

  _renderPane(type) {
    const select = type === "available" ? this.availableSelect : this.chosenSelect;
    const filter = type === "available" ? this.availableFilter : this.chosenFilter;
    const counter = type === "available" ? this.availableCounter : this.chosenCounter;
    const keys = type === "available" ? this.available : this.chosen;
    const term = filter ? filter.value.trim().toLowerCase() : "";

    // Preserve selection across re-renders
    const previousSelection = new Set(
      Array.from(select.selectedOptions, (opt) => opt.dataset.key)
    );

    const fragment = this.doc.createDocumentFragment();
    let visibleCount = 0;

    keys.forEach((key) => {
      const meta = this.options.get(key);
      if (!meta) return;
      if (term && !this._passesFilter(meta.label, term)) return;

      visibleCount++;
      const option = this.doc.createElement("option");
      option.value = meta.value;
      option.textContent = meta.label;
      option.dataset.key = key;
      option.disabled = meta.disabled;
      if (meta.title) option.title = meta.title;
      Object.entries(meta.dataset).forEach(([attr, value]) => {
        option.dataset[attr] = value;
      });
      if (previousSelection.has(key)) option.selected = true;
      fragment.appendChild(option);
    });

    select.replaceChildren(fragment);

    // Update counter
    if (counter) {
      const total = keys.length;
      counter.textContent = term
        ? `(${visibleCount} / ${total})`
        : `(${total})`;
    }

    this._updateButtons();
  }

  _passesFilter(label, term) {
    if (!term) return true;
    const haystack = label.toLowerCase();
    if (this.filterMatchMode === "startsWith") return haystack.startsWith(term);
    // "contains" mode – every whitespace-separated token must match
    const tokens = term.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  }

  // ---------------------------------------------------------------------------
  // Transfer logic
  // ---------------------------------------------------------------------------

  _getSelectedKeys(select) {
    return Array.from(select.selectedOptions, (opt) => opt.dataset.key);
  }

  _moveSelected(fromType, toType) {
    const fromSelect = fromType === "available" ? this.availableSelect : this.chosenSelect;
    const keys = this._getSelectedKeys(fromSelect).filter((key) => {
      const meta = this.options.get(key);
      return meta && !meta.disabled;
    });
    if (keys.length > 0) this._transfer(keys, fromType, toType);
  }

  _moveAll(fromType, toType) {
    const source = fromType === "available" ? this.available : this.chosen;
    const keys = source.filter((key) => {
      const meta = this.options.get(key);
      return meta && !meta.disabled;
    });
    if (keys.length > 0) this._transfer(keys, fromType, toType);
  }

  _transfer(keys, fromType, toType) {
    const from = fromType === "available" ? this.available : this.chosen;
    const to = toType === "available" ? this.available : this.chosen;
    const keySet = new Set(keys);

    // Remove from source
    const remaining = from.filter((key) => !keySet.has(key));
    from.splice(0, from.length, ...remaining);

    // Add to target
    to.push(...keys);

    // Sort
    this._sortByIndex(from);
    if (!this.preserveSelectionOrder || toType === "available") {
      this._sortByIndex(to);
    }

    // Sync state to original <select> FIRST, then render, then notify.
    this._syncToOriginal();
    this._render();
    this._dispatchChange();
  }

  _syncToOriginal() {
    const chosenSet = new Set(this.chosen);
    this.options.forEach((meta) => {
      meta.original.selected = chosenSet.has(meta.key);
    });
  }

  _dispatchChange() {
    const event = new Event("change", { bubbles: true });
    this.selectElement.dispatchEvent(event);
  }

  // ---------------------------------------------------------------------------
  // Button state management
  // ---------------------------------------------------------------------------

  _updateButtons() {
    const hasAvailableSelection = this.availableSelect.selectedOptions.length > 0;
    const hasChosenSelection = this.chosenSelect.selectedOptions.length > 0;
    const hasAvailableItems = this.available.some((k) => !this.options.get(k)?.disabled);
    const hasChosenItems = this.chosen.some((k) => !this.options.get(k)?.disabled);

    this._setButtonState("addSelected", !hasAvailableSelection);
    this._setButtonState("removeSelected", !hasChosenSelection);
    this._setButtonState("addAll", !hasAvailableItems);
    this._setButtonState("removeAll", !hasChosenItems);
  }

  _setButtonState(action, disabled) {
    const button = this.buttons[action];
    if (!button) return;

    button.disabled = disabled;

    const baseClasses = this.theme.button.split(/\s+/).filter(Boolean);
    const actionKey = `button${action.charAt(0).toUpperCase()}${action.slice(1)}`;
    const actionClasses = (this.theme[actionKey] || "").split(/\s+/).filter(Boolean);
    const disabledClasses = (this.theme.buttonDisabled || "").split(/\s+/).filter(Boolean);

    const finalClasses = [...baseClasses, ...actionClasses];
    if (disabled) finalClasses.push(...disabledClasses);
    button.className = [...new Set(finalClasses)].join(" ");
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** Revert the widget and restore the original <select> element. */
  destroy() {
    this.#abortController.abort();
    this.container.remove();
    this.selectElement.style.display = this.previousDisplay;
    this.selectElement.removeAttribute("data-filtered-select-multiple");
    this.placeholder.parentNode.insertBefore(this.selectElement, this.placeholder);
    this.placeholder.remove();
  }
}
