/**
 * wachtruimteStore — de lokale staat van De Wachtruimte.
 *
 * De Wachtruimte is voor mensen die op een wachtlijst staan. Alles wat ze hier
 * klaarzetten is van HEN: het staat in localStorage, het gaat nergens heen, en
 * het wordt pas met een hulpverlener gedeeld als ze die knop expliciet omzetten.
 *
 * GEEN vragenlijstdata hier. De nulmeting (PHQ-9 / GAD-7) leeft in
 * outcomesService en blijft daar — deze module leest die alleen af om te tonen
 * wat er al klaarstaat. Eén bron per soort data, nooit een tweede kopie.
 *
 * De doelen die iemand hier noteert zijn vrije tekst en dus mogelijk
 * gezondheidsgerelateerd: ze mogen NOOIT in analytics of in een URL belanden.
 */

export type WachtruimteStepId = 'coach' | 'intake' | 'nulmeting' | 'doelen';

export interface WachtruimteState {
  /** Stappen die de bezoeker als klaar markeerde (of die we konden afleiden). */
  done: WachtruimteStepId[];
  /** Wat de bezoeker wil bespreken in het eerste gesprek. Blijft lokaal. */
  goals: string;
  /** Expliciete toestemming om de voorbereiding te delen bij het eerste gesprek. */
  shareWithProvider: boolean;
  /** Stad waarvoor iemand wacht — puur om de pagina relevant te maken. */
  cityName: string | null;
  /** ISO-tijdstip van de laatste wijziging. */
  updatedAt: string | null;
}

const STORAGE_KEY = 'bondable_wachtruimte';

const EMPTY: WachtruimteState = {
  done: [],
  goals: '',
  shareWithProvider: false,
  cityName: null,
  updatedAt: null,
};

const hasWindow = (): boolean => typeof window !== 'undefined';

/** Lees de staat. Faalt stil terug op leeg — dit mag nooit een render breken. */
export function readState(): WachtruimteState {
  if (!hasWindow()) return { ...EMPTY };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<WachtruimteState>;
    return {
      done: Array.isArray(parsed.done)
        ? parsed.done.filter((s): s is WachtruimteStepId =>
            ['coach', 'intake', 'nulmeting', 'doelen'].includes(s as string),
          )
        : [],
      goals: typeof parsed.goals === 'string' ? parsed.goals : '',
      shareWithProvider: parsed.shareWithProvider === true,
      cityName: typeof parsed.cityName === 'string' ? parsed.cityName : null,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeState(next: WachtruimteState): WachtruimteState {
  const stamped = { ...next, updatedAt: new Date().toISOString() };
  if (!hasWindow()) return stamped;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
  } catch {
    /* stil falen — quota of private mode mag de Wachtruimte niet breken */
  }
  return stamped;
}

/** Zet een stap op klaar of terug op open. Geeft de nieuwe staat terug. */
export function setStepDone(
  step: WachtruimteStepId,
  done: boolean,
): WachtruimteState {
  const current = readState();
  const set = new Set(current.done);
  if (done) set.add(step);
  else set.delete(step);
  return writeState({ ...current, done: Array.from(set) });
}

/** Bewaar de doelen. Vrije tekst — blijft lokaal, gaat nooit naar analytics. */
export function setGoals(goals: string): WachtruimteState {
  const current = readState();
  const trimmed = goals.trimStart();
  const set = new Set(current.done);
  if (trimmed.trim().length >= 10) set.add('doelen');
  else set.delete('doelen');
  return writeState({ ...current, goals: trimmed, done: Array.from(set) });
}

/** Zet de deel-toestemming. Standaard uit; de bezoeker beslist. */
export function setShareWithProvider(share: boolean): WachtruimteState {
  return writeState({ ...readState(), shareWithProvider: share });
}

/** Onthoud voor welke stad iemand wacht (alleen om de pagina relevant te maken). */
export function setCityName(cityName: string | null): WachtruimteState {
  return writeState({ ...readState(), cityName });
}

/** Wis alles. De bezoeker mag zijn voorbereiding altijd weggooien. */
export function clearState(): WachtruimteState {
  if (hasWindow()) {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* stil falen */
    }
  }
  return { ...EMPTY };
}

export const wachtruimteStore = {
  readState,
  setStepDone,
  setGoals,
  setShareWithProvider,
  setCityName,
  clearState,
};

export default wachtruimteStore;
