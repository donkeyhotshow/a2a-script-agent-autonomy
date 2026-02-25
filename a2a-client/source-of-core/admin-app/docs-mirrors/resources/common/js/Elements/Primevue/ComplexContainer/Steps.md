# Steps.vue (Complex Container)

**Source:** `resources/common/js/Elements/Primevue/ComplexContainer/Steps.vue` (Path is assumed, file may not exist or
be used)

## Purpose

(Conceptual) Wraps the PrimeVue `Steps` component ([`<p-steps>`](https://primevue.org/steps/)) to display a process flow
or wizard-like navigation based on a defined model of steps.

## Rendering

- (Conceptual) Renders the core `<p-steps>` component.
- (Conceptual) Binds the `model` prop to `component.props.items` (the array defining the steps).
- (Conceptual) Binds `v-model:activeStep` to `component.props.activeStep` (or an internal ref if managed locally) to
  control/reflect the current active step.
- (Conceptual) Uses `v-bind="$attrs"` to pass down attributes from `component.attrs` to `<p-steps>` (e.g., `readonly`,
  `class`).
- (Conceptual) Listens for the `update:activeStep` event and emits `onUpdateActiveStep`.

## Props (Consumed by this Wrapper - Conceptual & Unvalidated)

- `component`: (Object, Required)
    - `component.props.items`: (Array, **Required**) An array of PrimeVue `MenuItem` objects defining the steps. Each
      item typically has:
        - `label`: (String) Text label for the step.
        - `to`: (String, Optional) Router link for navigation (if using Vue Router integration).
        - `icon`: (String, Optional) Icon for the step.
        - `command`: (Function, Optional) Callback function when step is clicked.
        - `disabled`: (Boolean, Optional) Whether the step is disabled.
        - `target`, `url`, `class`, etc.
    - `component.props.activeStep`: (Number, Required if controlled externally) The index of the currently active step (
      zero-based). This should be bound to a reactive variable.
    - `component.attrs`: (Object, Optional) Attributes to pass directly to the main `<p-steps>` component (e.g.,
      `{ "readonly": true }`).

## Events Emitted (Conceptual)

- `onUpdateActiveStep(newIndex)`: Emitted when the active step changes internally (e.g., user clicks a step if not
  `readonly`).

## Usage (JSON Example)

_Examples removed as requested. No validated examples found in `storage/`._

## Dependencies

- `primevue/steps`: The core PrimeVue component.

<!-- mirror-status: outdated -->
<!-- source-size: 486 -->

