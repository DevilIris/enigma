/// <reference types="cypress" />

// Visual demo: drives the running dev server and screenshots the key screens.
// Seeds Anilibria as the source (reliable in-browser: direct HLS) and skips
// onboarding so we land straight in the app.
//   npx cypress run --browser electron --spec cypress/e2e/demo.cy.ts

const APP = 'http://localhost:8101';
const PHONE: [number, number] = [390, 844];

function seed(win: Window) {
  win.localStorage.setItem(
    'CapacitorStorage.enigma.settings',
    JSON.stringify({ selectedMediaSource: 'Anilibria', showOnboarding: false, schemaVersion: 2 })
  );
}

describe('Enigma demo', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(...PHONE);
  });

  it('01 home — live AniList carousels', () => {
    cy.visit(`${APP}/tabs/home`, { onBeforeLoad: seed });
    cy.get('img', { timeout: 20000 }).should('have.length.greaterThan', 2);
    cy.wait(4000);
    cy.screenshot('01-home', { capture: 'viewport', overwrite: true });
  });

  it('02 search results', () => {
    cy.visit(`${APP}/tabs/search`, { onBeforeLoad: seed });
    cy.get('ion-searchbar input', { timeout: 15000 }).type('frieren{enter}');
    cy.wait(6000);
    cy.screenshot('02-search', { capture: 'viewport', overwrite: true });
  });

  it('03 details + episode list (the fix)', () => {
    // Frieren: Beyond Journey's End — AniList id 154587.
    cy.visit(`${APP}/tabs/home/anime/meta/154587`, { onBeforeLoad: seed });
    // Wait for the episode rows to resolve via the source fallback chain.
    cy.contains('h3', 'Episode 1', { timeout: 45000 });
    cy.wait(1500);
    // Header/synopsis screenshot.
    cy.screenshot('03-details', { capture: 'viewport', overwrite: true });
    // IonContent has its own scroll container — scroll it down to the episode
    // list (the window/fullPage capture can't reach it).
    cy.get('ion-content')
      .first()
      .then(($c) => {
        const el = $c[0] as HTMLElement & { scrollToPoint?: (x: number, y: number, d: number) => void };
        if (el.scrollToPoint) el.scrollToPoint(0, 690, 0);
      });
    cy.wait(1000);
    cy.screenshot('04-episodes', { capture: 'viewport', overwrite: true });
  });
});
