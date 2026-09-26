// ── Draft persistence hook ───────────────────────────────────────────────────
// Encapsulates restore-on-mount + autosave. The wizard component stays purely
// presentational and knows nothing about localStorage.
//
// Restore happens synchronously in lazy state initializers — no mount-effect
// race, no "ready" flag, and autosave is safe from the first keystroke.

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { DraftField, OnboardingErrors, ProfileDraft, StepId } from './types';
import { EMPTY_DRAFT } from './types';
import { clearError, validateStep } from './validation';

const DRAFT_KEY = 'shiarishta_onboarding_draft';

// Scope the draft to the signed-in account — two members on one device must
// never see each other's answers.
function sessionUid(): string {
  try {
    const raw = localStorage.getItem('sh_session');
    const uid = raw ? JSON.parse(raw).uid : null;
    return uid || 'signed-out';
  } catch { return 'signed-out'; }
}
const scopedDraftKey = () => `${DRAFT_KEY}::${sessionUid()}`;
export const TOTAL_STEPS = 7;

interface PersistedDraft {
  data: Partial<ProfileDraft>;
  step: number;
}

function restore(): { data: Partial<ProfileDraft>; step: StepId } | null {
  try {
    const raw = localStorage.getItem(scopedDraftKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedDraft;
    return {
      data: parsed.data ?? {},
      step: (Math.min(Math.max(parsed.step ?? 1, 1), TOTAL_STEPS) as StepId),
    };
  } catch {
    return null; // corrupted draft — start fresh
  }
}

function coerceStep(step: number): StepId {
  return Math.min(Math.max(step, 1), TOTAL_STEPS) as StepId;
}

export function useOnboardingDraft() {
  // Read the draft exactly once per mount, before first paint.
  const saved = useMemo(restore, []);

  const [step, setStepState] = useState<StepId>(() => saved?.step ?? 1);
  const [data, setData] = useState<ProfileDraft>(() => ({ ...EMPTY_DRAFT, ...saved?.data }));
  const [errors, setErrors] = useState<OnboardingErrors>({});
  const [draftRestored] = useState(() => saved != null);

  // Autosave on every change. Writing the just-restored values back is a no-op
  // byte-wise, so no post-restore gate is needed.
  useEffect(() => {
    try {
      localStorage.setItem(scopedDraftKey(), JSON.stringify({ data, step }));
    } catch {
      /* storage full — non-fatal */
    }
  }, [data, step]);

  const update = useCallback((field: DraftField, value: ProfileDraft[DraftField]) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => clearError(prev, field));
  }, []);

  const toggleIn = useCallback(
    (field: 'languages' | 'citizenships', value: string) => {
      setData((prev) => {
        const list = prev[field];
        return { ...prev, [field]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
      });
      setErrors((prev) => clearError(prev, field));
    },
    [],
  );

  const setStep = useCallback((next: number) => {
    setErrors({});
    setStepState(coerceStep(next));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const goTo = useCallback(
    (target: number) => {
      // Jump back only — moving forward requires validation.
      if (target < step) setStep(target);
    },
    [step, setStep],
  );

  const next = useCallback(
    (onValid: () => void) => {
      const e = validateStep(step, data);
      setErrors(e);
      if (Object.values(e).some(Boolean)) return;
      if (step < TOTAL_STEPS) setStep(step + 1);
      else onValid();
    },
    [step, data, setStep],
  );

  const back = useCallback(() => {
    if (step > 1) setStep(step - 1);
  }, [step, setStep]);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(scopedDraftKey());
    } catch {
      /* ignore */
    }
  }, []);

  return {
    step,
    totalSteps: TOTAL_STEPS,
    data,
    errors,
    update,
    toggleIn,
    draftRestored,
    goTo,
    next,
    back,
    reset,
  };
}
