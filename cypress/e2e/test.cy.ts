describe('Enigma smoke test', () => {
  it('boots and shows the Home tab', () => {
    cy.visit('/');
    // First launch shows onboarding; skip it if present.
    cy.get('body').then(($body) => {
      if ($body.text().includes('Skip')) {
        cy.contains('ion-button', 'Skip').click();
      }
    });
    cy.contains('ion-title', 'Home', { timeout: 10000 });
  });
});
