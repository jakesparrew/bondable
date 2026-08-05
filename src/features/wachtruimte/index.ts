/**
 * De Wachtruimte — publieke ingangen van de feature.
 *
 * WachtruimtePage  → mount op /wachtruimte (publiek, eigen chrome).
 * WachtruimtePanel → mount ingebed (client-dashboard, of een andere surface).
 * FinderDeadEnd    → wat de finder toont wanneer hij niets vindt.
 * WaitlistCapture  → losse e-mailopvang, herbruikbaar op elke wachtsurface.
 * WachtruimteCrisis→ het nooduitgangblok; nooit gated, nooit een experiment.
 */

export { default as WachtruimtePage } from './WachtruimtePage';
export { default as WachtruimtePanel } from './WachtruimtePanel';
export { default as FinderDeadEnd } from './FinderDeadEnd';
export { default as WaitlistCapture } from './WaitlistCapture';
export { default as WachtruimteCrisis } from './WachtruimteCrisis';
export * from './wachtruimteStore';
export type { WachtruimtePanelProps } from './WachtruimtePanel';
export type { FinderDeadEndProps } from './FinderDeadEnd';
export type { WaitlistCaptureProps } from './WaitlistCapture';
