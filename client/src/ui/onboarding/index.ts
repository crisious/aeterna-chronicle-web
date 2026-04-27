/**
 * 온보딩 모듈 — 첫 30분 경험 진입점
 *
 * 외부에서는 본 파일만 import한다.
 *   import { OnboardingDirector, type OnboardingGateResult } from '@/ui/onboarding';
 *
 * 내부 파일 직접 import 금지 — 결합도 격리.
 */

export { OnboardingDirector } from './OnboardingDirector';
export type { OnboardingDirectorOptions } from './OnboardingDirector';

export { CoachmarkOverlay } from './CoachmarkOverlay';
export type { CoachmarkOverlayOptions } from './CoachmarkOverlay';

export { OnboardingProgress, createInitialProgress } from './OnboardingProgress';

export {
  ONBOARDING_COACHMARKS,
  coachmarksForPhase,
  coachmarksForSystem,
  isLearningCoachmark,
} from './OnboardingStepRegistry';

export {
  CORE_SYSTEMS,
  ONBOARDING_PHASES,
  type CoachmarkSpec,
  type CoreSystemId,
  type OnboardingEvent,
  type OnboardingGateResult,
  type OnboardingPhaseId,
  type OnboardingProgressState,
} from './types';
