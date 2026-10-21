import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

import { FilteredSelectMultiple } from "../src/FilteredSelectMultiple.js";

const { window } = new JSDOM("<!doctype html><html><head></head><body></body></html>");
const { document } = window;

// The widget uses these globals at call time; they must come from jsdom.
globalThis.HTMLSelectElement = window.HTMLSelectElement;
globalThis.Event = window.Event;
globalThis.AbortController = window.AbortController;

function makeSelect({ disabled = false } = {}) {
  const select = document.createElement("select");
  select.multiple = true;
  select.disabled = disabled;
  ["Apple", "Banana", "Cherry"].forEach((label, i) => {
    const option = document.createElement("option");
    option.value = String(i);
    option.textContent = label;
    option.selected = i === 1;
    select.appendChild(option);
  });
  document.body.appendChild(select);
  return select;
}

function selectedValues(select) {
  return Array.from(select.selectedOptions, (opt) => opt.value);
}

function countChanges(select) {
  const counter = { count: 0 };
  select.addEventListener("change", () => counter.count++);
  return counter;
}

beforeEach(() => {
  document.body.replaceChildren();
});

test("an enabled select transfers items", () => {
  const select = makeSelect();
  const changes = countChanges(select);
  const widget = new FilteredSelectMultiple(select);

  widget.buttons.addAll.click();

  assert.deepEqual(selectedValues(select), ["0", "1", "2"]);
  assert.equal(changes.count, 1);
});

test("a disabled select gives a read-only widget", () => {
  const select = makeSelect({ disabled: true });
  const changes = countChanges(select);
  const widget = new FilteredSelectMultiple(select);

  const assertAllButtonsDisabled = () => {
    Object.entries(widget.buttons).forEach(([action, button]) => {
      assert.equal(button.disabled, true, `${action} button should be disabled`);
    });
  };

  assertAllButtonsDisabled();

  // Selecting options must not enable any button.
  widget.availableSelect.options[0].selected = true;
  widget.availableSelect.dispatchEvent(new window.Event("change"));
  widget.chosenSelect.options[0].selected = true;
  widget.chosenSelect.dispatchEvent(new window.Event("change"));
  assertAllButtonsDisabled();

  // Neither double-click nor Enter may move anything.
  widget.availableSelect.dispatchEvent(new window.MouseEvent("dblclick"));
  widget.availableSelect.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
  widget.chosenSelect.dispatchEvent(new window.MouseEvent("dblclick"));
  widget.chosenSelect.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

  assert.deepEqual(selectedValues(select), ["1"]);
  assert.equal(changes.count, 0);

  // Filtering stays available so long lists remain readable.
  assert.equal(widget.availableFilter.disabled, false);
  assert.equal(widget.chosenFilter.disabled, false);
});
