/**
 * Theme definitions for FilteredSelectMultiple widget.
 * Plain objects mapping element roles to CSS class strings.
 *
 * All keys use camelCase. Every key listed in defaultTheme MUST be present
 * in custom themes (missing keys are filled from defaultTheme at runtime).
 */

/**
 * Default/minimal theme (original classes)
 */
export const defaultTheme = {
  container: "filtered-select-multiple",
  column: "fsm-column",
  availableColumn: "fsm-available",
  chosenColumn: "fsm-chosen",
  label: "fsm-label",
  filter: "fsm-filter",
  select: "fsm-select",
  controls: "fsm-controls",
  button: "fsm-button",
  buttonAddAll: "fsm-add-all",
  buttonAddSelected: "fsm-add-selected",
  buttonRemoveSelected: "fsm-remove-selected",
  buttonRemoveAll: "fsm-remove-all",
  buttonDisabled: "fsm-button-disabled",
  counter: "fsm-counter",
};

/**
 * Bootstrap 5 theme preset
 */
export const bootstrap5Theme = {
  container: "d-flex gap-3",
  column: "d-flex flex-column",
  availableColumn: "d-flex flex-column",
  chosenColumn: "d-flex flex-column",
  label: "form-label fw-semibold mb-2",
  filter: "form-control form-control-sm mb-2",
  select: "form-select flex-grow-1",
  controls: "d-flex flex-column justify-content-center gap-2 px-3",
  button: "btn btn-sm d-inline-flex align-items-center gap-1",
  buttonAddAll: "btn-outline-primary justify-content-end",
  buttonAddSelected: "btn-primary justify-content-end",
  buttonRemoveSelected: "btn-primary justify-content-start",
  buttonRemoveAll: "btn-outline-primary justify-content-start",
  buttonDisabled: "btn-secondary",
  counter: "text-muted small",
};

/**
 * DaisyUI 5 theme preset
 */
export const daisyUITheme = {
  container: "flex gap-4",
  column: "flex flex-col",
  availableColumn: "flex flex-col",
  chosenColumn: "flex flex-col",
  label: "label label-text font-semibold mb-2",
  filter: "input input-bordered input-sm mb-2 w-full",
  select: "select select-bordered w-full flex-grow",
  controls: "flex flex-col justify-center gap-2 px-4",
  button: "btn btn-sm inline-flex items-center gap-1",
  buttonAddAll: "btn-outline btn-secondary justify-end",
  buttonAddSelected: "btn-primary justify-end",
  buttonRemoveSelected: "btn-primary justify-start",
  buttonRemoveAll: "btn-outline btn-secondary justify-start",
  buttonDisabled: "btn-disabled",
  counter: "text-sm opacity-70",
};

/**
 * Tailwind CSS 4 theme preset (minimal utility classes)
 */
export const tailwindTheme = {
  container: "flex gap-4",
  column: "flex flex-col",
  availableColumn: "flex flex-col",
  chosenColumn: "flex flex-col",
  label: "font-semibold text-sm mb-2",
  filter: "border border-slate-300 rounded px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500",
  select: "border border-slate-300 rounded px-2 py-1 min-w-[200px] flex-grow",
  controls: "flex flex-col justify-center gap-2 px-4",
  button: "inline-flex items-center gap-2 px-3 py-2 text-sm border rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  buttonAddAll: "border-slate-300 hover:bg-slate-50 justify-end",
  buttonAddSelected: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 justify-end",
  buttonRemoveSelected: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 justify-start",
  buttonRemoveAll: "border-slate-300 hover:bg-slate-50 justify-start",
  buttonDisabled: "",
  counter: "text-xs text-slate-500",
};
