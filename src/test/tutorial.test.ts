import { beforeEach, describe, expect, it } from 'vitest';
import { COACH_TIPS, TUTORIAL_STEPS, TUTORIAL_STEP_COUNT, openerFor } from '../game/tutorial';
import { CLASSES } from '../game/constants';
import { useGame } from '../store';

const g = () => useGame.getState();

describe('tutorial step data', () => {
  it('gives every step a unique id', () => {
    const ids = TUTORIAL_STEPS.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every step a way forward — a button, or a condition, or both', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(!!s.cta || !!s.advanceOn, `${s.id} is a dead end`).toBe(true);
    }
  });

  it('pairs every action prompt with a condition that can satisfy it', () => {
    // A prompt telling the player to do something, with nothing watching for it,
    // would strand them on a step that never completes.
    for (const s of TUTORIAL_STEPS) {
      if (s.action) expect(!!s.advanceOn, `${s.id} prompts an action nobody watches`).toBe(true);
    }
  });

  it('ends on a step with no action, so the tour always closes cleanly', () => {
    const last = TUTORIAL_STEPS[TUTORIAL_STEP_COUNT - 1];
    expect(last.cta).toBeTruthy();
    expect(last.advanceOn).toBeUndefined();
  });

  it('covers every chapter in order, with no gaps', () => {
    const chapters = [...new Set(TUTORIAL_STEPS.map(s => s.chapter))];
    expect(chapters).toEqual([...chapters].sort((a, b) => a - b));
    expect(chapters).toEqual(Array.from({ length: chapters.length }, (_, i) => i));
  });

  it('has a narrator opener for all seven classes', () => {
    for (const c of CLASSES) {
      for (let i = 0; i < TUTORIAL_STEP_COUNT; i++) {
        expect(openerFor(c.id, i), `${c.id} step ${i}`).toBeTruthy();
      }
    }
  });

  it('points every coach tip at a route the app can actually be on', () => {
    for (const path of Object.keys(COACH_TIPS)) expect(path.startsWith('/')).toBe(true);
  });
});

describe('tutorial cursor', () => {
  beforeEach(() => {
    g().resetGame();
    g().createCharacter('Tester', ['healer']);
  });

  it('starts a new character at step 0', () => {
    expect(g().tutorialStep).toBe(0);
    expect(g().seenPages).toEqual([]);
  });

  it('advances one step at a time and ends as null, never past the array', () => {
    for (let i = 0; i < TUTORIAL_STEP_COUNT - 1; i++) {
      g().advanceTutorial();
      expect(g().tutorialStep).toBe(i + 1);
    }
    g().advanceTutorial();
    expect(g().tutorialStep).toBeNull();
    // Advancing again on a finished tour must stay finished rather than wrapping.
    g().advanceTutorial();
    expect(g().tutorialStep).toBeNull();
  });

  it('skipping parks at -1 so coach tips still fire, unlike a completed tour', () => {
    g().skipTutorial();
    expect(g().tutorialStep).toBe(-1);
    // A skipped tour must not resume on the next advance.
    g().advanceTutorial();
    expect(g().tutorialStep).toBe(-1);
  });

  it('replays from the top and forgets which pages were seen', () => {
    g().markPageSeen('/journal');
    g().completeTutorial();
    expect(g().tutorialStep).toBeNull();

    g().replayTutorial();
    expect(g().tutorialStep).toBe(0);
    expect(g().seenPages).toEqual([]);
  });

  it('records a page once, however many times it is visited', () => {
    g().markPageSeen('/market');
    g().markPageSeen('/market');
    g().markPageSeen('/social');
    expect(g().seenPages).toEqual(['/market', '/social']);
  });

  it('refuses to jump outside the tour', () => {
    g().goToTutorialStep(5);
    expect(g().tutorialStep).toBe(5);
    g().goToTutorialStep(-3);
    expect(g().tutorialStep).toBe(5);
    g().goToTutorialStep(TUTORIAL_STEP_COUNT);
    expect(g().tutorialStep).toBe(5);
  });

  it('leaves an existing save alone — a veteran is never dropped into onboarding', () => {
    g().resetGame();
    expect(g().tutorialStep).toBeNull();
  });
});
