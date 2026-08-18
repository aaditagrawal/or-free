import type { CSSProperties } from "react";

/**
 * React's `CSSProperties` is deliberately closed — it has no index signature —
 * so custom properties have to enter through a contract that names them.
 * `--${string}` keys are exactly the CSS custom-property grammar, which keeps
 * the call site honest without an assertion.
 */
export type CssVariables = Record<`--${string}`, string | number>;

export function cssVars(variables: CssVariables): CSSProperties {
  return variables;
}
