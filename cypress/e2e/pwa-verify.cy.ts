/// <reference types="cypress" />

// Verifies the PRODUCTION build (no dev /__proxy) works as a static PWA:
// search falls back to AniList, episodes load via direct-CORS Anilibria.
const APP = 'http://localhost:4173';

function seed(win: Window) {
  // Skip onboarding; keep the DEFAULT source (AnimeNana) to test real PWA behaviour.
  win.localStorage.setItem(
    'CapacitorStorage.enigma.settings',
    JSON.stringify({ showOnboarding: false, schemaVersion: 2 })
  );
}

describe('PWA production build (no proxy)', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(390, 844);
  });

  it('search falls back to AniList', () => {
    cy.visit(`${APP}/tabs/search`, { onBeforeLoad: seed });
    cy.get('ion-searchbar input', { timeout: 15000 }).type('frieren{enter}');
    cy.wait(6000);
    cy.screenshot('pwa-01-search', { capture: 'viewport', overwrite: true });
  });

  it('episodes load via direct Anilibria', () => {
    cy.visit(`${APP}/tabs/home/anime/meta/154587`, { onBeforeLoad: seed });
    cy.contains('h3', 'Episode 1', { timeout: 45000 }).should('exist');
    cy.get('ion-content')
      .first()
      .then(($c) => {
        const el = $c[0] as HTMLElement & { scrollToPoint?: (x: number, y: number, d: number) => void };
        if (el.scrollToPoint) el.scrollToPoint(0, 690, 0);
      });
    cy.wait(1000);
    cy.screenshot('pwa-02-episodes', { capture: 'viewport', overwrite: true });
  });
});
