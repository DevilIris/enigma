/// <reference types="cypress" />

// Verifies the GitHub-Pages-style build served under the /enigma/ SUBPATH:
// assets resolve, the router (basename) mounts, and episodes load via Anilibria.
const APP = 'http://localhost:4174/enigma';

function seed(win: Window) {
  win.localStorage.setItem(
    'CapacitorStorage.enigma.settings',
    JSON.stringify({ showOnboarding: false, schemaVersion: 2 })
  );
}

describe('GitHub Pages subpath build', () => {
  beforeEach(() => {
    Cypress.on('uncaught:exception', () => false);
    cy.viewport(390, 844);
  });

  it('app mounts + home renders under /enigma/', () => {
    cy.visit(`${APP}/tabs/home`, { onBeforeLoad: seed });
    // Real content (cover images) proves assets + router + data all work.
    cy.get('img', { timeout: 20000 }).should('have.length.greaterThan', 2);
    cy.wait(3000);
    cy.screenshot('pages-01-home', { capture: 'viewport', overwrite: true });
  });

  it('episodes load via direct Anilibria under subpath', () => {
    cy.visit(`${APP}/tabs/home/anime/meta/154587`, { onBeforeLoad: seed });
    cy.contains('h3', 'Episode 1', { timeout: 45000 }).should('exist');
    cy.get('ion-content')
      .first()
      .then(($c) => {
        const el = $c[0] as HTMLElement & { scrollToPoint?: (x: number, y: number, d: number) => void };
        if (el.scrollToPoint) el.scrollToPoint(0, 690, 0);
      });
    cy.wait(1000);
    cy.screenshot('pages-02-episodes', { capture: 'viewport', overwrite: true });
  });
});
