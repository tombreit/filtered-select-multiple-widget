/**
 * Theme definitions for FilteredSelectMultiple widget
 * Simple objects mapping element types to CSS class strings
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
  button_addAll: "fsm-add-all",
  button_addSelected: "fsm-add-selected",
  button_removeSelected: "fsm-remove-selected",
  button_removeAll: "fsm-remove-all",
  buttonDisabled: "fsm-button-disabled",
  button_svg: "fsm-button-svg",
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
  button: "btn btn-sm btn-primary",
  button_addAll: "",
  button_addSelected: "",
  button_removeSelected: "",
  button_removeAll: "",
  buttonDisabled: "disabled",
  button_svg: "d-inline-block",
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
  button: "btn btn-sm",
  button_addAll: "btn-secondary",
  button_addSelected: "btn-primary",
  button_removeSelected: "btn-primary",
  button_removeAll: "btn-secondary",
  buttonDisabled: "btn-disabled",
  button_svg: "",
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
  button: "inline-flex items-center gap-2 px-3 py-2 text-sm border rounded hover:bg-slate-50 transition-colors",
  button_addAll: "border-slate-300",
  button_addSelected: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  button_removeSelected: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700",
  button_removeAll: "border-slate-300",
  buttonDisabled: "opacity-50 cursor-not-allowed",
  button_svg: "",
};
