import React from 'react';
import { IonContent, IonPage, IonSpinner } from '@ionic/react';

/** Shown while persisted stores hydrate, so screens never flash empty data. */
const SplashScreen: React.FC = () => (
  <IonPage>
    <IonContent>
      <div
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <h1 style={{ margin: 0, letterSpacing: 2, color: 'var(--enigma-accent)' }}>
          ENIGMA
        </h1>
        <IonSpinner name="crescent" />
      </div>
    </IonContent>
  </IonPage>
);

export default SplashScreen;
