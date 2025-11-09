import { defaultTheme } from "./themes.js";

/**
 * Transform a native <select multiple> element into a dual-list transfer widget.
 * 
 * Usage:
 *   import { FilteredSelectMultiple } from "filtered-select-multiple-widget";
 *   const widget = new FilteredSelectMultiple(selectElement, options);
 */
export class FilteredSelectMultiple {
  constructor(selectElement, options = {}) {
    // Validate
    if (!(selectElement instanceof HTMLSelectElement) || !selectElement.multiple) {
      throw new Error("FilteredSelectMultiple requires a <select multiple> element");
    }

    this.selectElement = selectElement;
    this.doc = selectElement.ownerDocument;
    
    // Parse options
    const optionCount = selectElement.options.length;
    this.showFilter = options.showFilter ?? true;
    this.filterMatchMode = options.filterMatchMode ?? "contains";
    this.size = options.size ?? (selectElement.size || Math.min(Math.max(optionCount, 4), 12));
    this.preserveSelectionOrder = options.preserveSelectionOrder ?? false;
    this.theme = { ...defaultTheme, ...options.theme };
    
    // Parse text options
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
    
    // Auto-detect labels from <label> element if defaults are used
    if (this.text.availableLabel === textDefaults.availableLabel && 
        this.text.chosenLabel === textDefaults.chosenLabel) {
      const label = this.doc.querySelector(`label[for="${selectElement.id}"]`);
      if (label) {
        const baseLabel = label.textContent.trim();
        this.text.availableLabel = `Available ${baseLabel}`;
        this.text.chosenLabel = `Chosen ${baseLabel}`;
      }
    }
    
    // Set filter placeholder defaults
    const fallbackFilter = options.text?.filterPlaceholder ?? textDefaults.filterPlaceholder;
    this.text.availableFilterPlaceholder = this.text.availableFilterPlaceholder ?? fallbackFilter;
    this.text.chosenFilterPlaceholder = this.text.chosenFilterPlaceholder ?? fallbackFilter;
    
    // State
    this.options = new Map(); // key -> {index, value, label, disabled, dataset, title, original}
    this.available = [];
    this.chosen = [];
    
    // UI elements
    this.container = null;
    this.availableSelect = null;
    this.chosenSelect = null;
    this.availableFilter = null;
    this.chosenFilter = null;
    this.buttons = {};
    
    this._init();
  }

  _init() {
    // Build state from original select
    this._buildState();
    
    // Hide original select
    this.selectElement.dataset.filteredSelectMultiple = "true";
    this.previousDisplay = this.selectElement.style.display;
    this.selectElement.style.display = "none";
    
    // Create placeholder comment for restoring position
    this.placeholder = this.doc.createComment("filtered-select-multiple");
    this.selectElement.parentNode.insertBefore(this.placeholder, this.selectElement);
    
    // Build and render UI
    this._buildUI();
    this._attachEvents();
    this._render();
  }

  _buildState() {
    const options = Array.from(this.selectElement.options);
    const orderKeys = [];
    
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
      
      orderKeys.push(key);
      if (option.selected) {
        this.chosen.push(key);
      } else {
        this.available.push(key);
      }
    });
    
    // Sort by original order
    this._sortByIndex(this.available);
    if (!this.preserveSelectionOrder) {
      this._sortByIndex(this.chosen);
    }
  }

  _sortByIndex(keys) {
    keys.sort((a, b) => {
      const aIndex = this.options.get(a)?.index ?? Number.MAX_SAFE_INTEGER;
      const bIndex = this.options.get(b)?.index ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex;
    });
  }

  _buildUI() {
    // Main container
    this.container = this.doc.createElement("div");
    this.container.className = this.theme.container;
    
    // Available pane
    const availablePane = this._createPane({
      type: "available",
      label: this.text.availableLabel,
      filterPlaceholder: this.text.availableFilterPlaceholder,
    });
    this.availableSelect = availablePane.select;
    this.availableFilter = availablePane.filter;
    
    // Controls (buttons)
    const controls = this._createControls();
    
    // Chosen pane
    const chosenPane = this._createPane({
      type: "chosen",
      label: this.text.chosenLabel,
      filterPlaceholder: this.text.chosenFilterPlaceholder,
    });
    this.chosenSelect = chosenPane.select;
    this.chosenFilter = chosenPane.filter;
    
    // Assemble
    this.container.append(availablePane.column, controls, chosenPane.column);
    this.placeholder.parentNode.insertBefore(this.container, this.placeholder);
  }

  _createPane({ type, label, filterPlaceholder }) {
    const column = this.doc.createElement("div");
    const isAvailable = type === "available";
    column.className = this.theme.column + " " + (isAvailable ? this.theme.availableColumn : this.theme.chosenColumn);
    
    // Label
    const labelEl = this.doc.createElement("div");
    labelEl.className = this.theme.label;
    labelEl.textContent = label;
    column.appendChild(labelEl);
    
    // Filter input (optional)
    let filter = null;
    if (this.showFilter) {
      filter = this.doc.createElement("input");
      filter.type = "search";
      filter.className = this.theme.filter;
      filter.placeholder = filterPlaceholder;
      filter.dataset.paneType = type;
      column.appendChild(filter);
    }
    
    // Select element
    const select = this.doc.createElement("select");
    select.multiple = true;
    select.size = this.size;
    select.className = this.theme.select;
    select.dataset.paneType = type;
    column.appendChild(select);
    
    return { column, select, filter };
  }

  _createControls() {
    const column = this.doc.createElement("div");
    column.className = this.theme.controls;
    
    const icons = {
      addAll: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="height: 1.2em;">
  <path stroke-linecap="round" stroke-linejoin="round" d="m5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5" />
</svg>`,
      addSelected: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="height: 1.2em;">
  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
</svg>`,
      removeSelected: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="height: 1.2em;">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
</svg>`,
      removeAll: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="height: 1.2em;">
  <path stroke-linecap="round" stroke-linejoin="round" d="m18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5" />
</svg>`,
    };
    
    const buttons = [
      { action: "addAll", label: this.text.addAll, icon: icons.addAll },
      { action: "addSelected", label: this.text.addSelected, icon: icons.addSelected },
      { action: "removeSelected", label: this.text.removeSelected, icon: icons.removeSelected },
      { action: "removeAll", label: this.text.removeAll, icon: icons.removeAll },
    ];
    
    buttons.forEach(({ action, label, icon }) => {
      const button = this.doc.createElement("button");
      button.type = "button";
      const specificClass = this.theme[`button_${action}`] || "";
      button.className = (this.theme.button + " " + specificClass).trim();
      
      const isRemove = action.startsWith("remove");
      const svgClass = this.theme.button_svg ? ` class="${this.theme.button_svg}"` : '';
      const modifiedIcon = icon.replace('<svg', `<svg${svgClass}`);
      button.innerHTML = isRemove ? `${modifiedIcon} ${label}` : `${label} ${modifiedIcon}`;
      button.dataset.action = action;
      
      this.buttons[action] = button;
      column.appendChild(button);
    });
    
    return column;
  }

  _attachEvents() {
    // Filter input events
    if (this.availableFilter) {
      this.availableFilter.addEventListener("input", () => this._renderPane("available"));
    }
    if (this.chosenFilter) {
      this.chosenFilter.addEventListener("input", () => this._renderPane("chosen"));
    }
    
    // Selection change events
    this.availableSelect.addEventListener("change", () => this._updateButtons());
    this.chosenSelect.addEventListener("change", () => this._updateButtons());
    
    // Double-click to move
    this.availableSelect.addEventListener("dblclick", () => {
      if (!this.availableSelect.disabled) {
        this._moveSelected("available", "chosen");
      }
    });
    this.chosenSelect.addEventListener("dblclick", () => {
      if (!this.chosenSelect.disabled) {
        this._moveSelected("chosen", "available");
      }
    });
    
    // Button clicks
    Object.entries(this.buttons).forEach(([action, button]) => {
      button.addEventListener("click", () => {
        switch (action) {
          case "addAll":
            this._moveAll("available", "chosen");
            break;
          case "addSelected":
            this._moveSelected("available", "chosen");
            break;
          case "removeSelected":
            this._moveSelected("chosen", "available");
            break;
          case "removeAll":
            this._moveAll("chosen", "available");
            break;
        }
      });
    });
  }

  _render() {
    this._renderPane("available");
    this._renderPane("chosen");
    this._updateButtons();
  }

  _renderPane(type) {
    const select = type === "available" ? this.availableSelect : this.chosenSelect;
    const filter = type === "available" ? this.availableFilter : this.chosenFilter;
    const keys = type === "available" ? this.available : this.chosen;
    
    // Get filter term
    const term = filter ? filter.value.trim().toLowerCase() : "";
    
    // Preserve selection
    const previousSelection = new Set(
      Array.from(select.selectedOptions, opt => opt.dataset.key)
    );
    
    // Clear and rebuild
    select.innerHTML = "";
    
    keys.forEach(key => {
      const meta = this.options.get(key);
      if (!meta) return;
      
      // Apply filter
      if (term && !this._passesFilter(meta.label, term)) {
        return;
      }
      
      const option = this.doc.createElement("option");
      option.value = meta.value;
      option.textContent = meta.label;
      option.dataset.key = key;
      option.disabled = meta.disabled;
      
      if (meta.title) {
        option.title = meta.title;
      }
      
      Object.entries(meta.dataset).forEach(([attr, value]) => {
        option.dataset[attr] = value;
      });
      
      if (previousSelection.has(key)) {
        option.selected = true;
      }
      
      select.appendChild(option);
    });
  }

  _passesFilter(label, term) {
    if (!term) return true;
    
    const haystack = label.toLowerCase();
    
    if (this.filterMatchMode === "startsWith") {
      return haystack.startsWith(term);
    }
    
    // "contains" mode - all tokens must match
    const tokens = term.split(/\s+/).filter(Boolean);
    return tokens.every(token => haystack.includes(token));
  }

  _getSelectedKeys(select) {
    return Array.from(select.selectedOptions, opt => opt.dataset.key);
  }

  _moveSelected(fromType, toType) {
    const fromSelect = fromType === "available" ? this.availableSelect : this.chosenSelect;
    const keys = this._getSelectedKeys(fromSelect);
    if (keys.length > 0) {
      this._transfer(keys, fromType, toType);
    }
  }

  _moveAll(fromType, toType) {
    const keys = fromType === "available" ? [...this.available] : [...this.chosen];
    if (keys.length > 0) {
      this._transfer(keys, fromType, toType);
    }
  }

  _transfer(keys, fromType, toType) {
    const from = fromType === "available" ? this.available : this.chosen;
    const to = toType === "available" ? this.available : this.chosen;
    
    const keySet = new Set(keys);
    
    // Remove from source
    const remaining = from.filter(key => !keySet.has(key));
    from.splice(0, from.length, ...remaining);
    
    // Add to target
    to.push(...keys);
    
    // Sort
    this._sortByIndex(from);
    if (!this.preserveSelectionOrder || toType === "available") {
      this._sortByIndex(to);
    }
    
    // Update and notify
    this._render();
    this._syncToOriginal();
    this._dispatchChange();
  }

  _syncToOriginal() {
    const chosenSet = new Set(this.chosen);
    this.options.forEach(meta => {
      meta.original.selected = chosenSet.has(meta.key);
    });
  }

  _dispatchChange() {
    const event = new Event("change", { bubbles: true });
    this.selectElement.dispatchEvent(event);
  }

  _updateButtons() {
    const hasAvailableSelection = this.availableSelect.selectedOptions.length > 0;
    const hasChosenSelection = this.chosenSelect.selectedOptions.length > 0;
    const hasAvailableItems = this.available.length > 0;
    const hasChosenItems = this.chosen.length > 0;
    
    this._setButtonState("addSelected", !hasAvailableSelection);
    this._setButtonState("removeSelected", !hasChosenSelection);
    this._setButtonState("addAll", !hasAvailableItems);
    this._setButtonState("removeAll", !hasChosenItems);
  }

  _setButtonState(action, disabled) {
    const button = this.buttons[action];
    if (!button) return;

    button.disabled = disabled;

    // Rebuild className from scratch to avoid classList issues with spaces
    const baseClasses = this.theme.button.split(/\s+/).filter(Boolean);
    const actionClasses = (this.theme[`button_${action}`] || '').split(/\s+/).filter(Boolean);
    const disabledClasses = (this.theme.buttonDisabled || '').split(/\s+/).filter(Boolean);

    let finalClasses = [...baseClasses, ...actionClasses];
    if (disabled) {
      finalClasses.push(...disabledClasses);
    }

    button.className = [...new Set(finalClasses)].join(' ');
  }

  /** Revert the widget and show the original select element */
  destroy() {
    this.container.remove();
    this.selectElement.style.display = this.previousDisplay;
    this.selectElement.removeAttribute("data-filtered-select-multiple");
    this.placeholder.parentNode.insertBefore(this.selectElement, this.placeholder);
    this.placeholder.remove();
  }
}
