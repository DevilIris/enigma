import React from 'react';
import { IonButton, IonButtons, IonIcon, useIonRouter } from '@ionic/react';
import { settingsOutline } from 'ionicons/icons';
import { routes } from '../../routes';

/** Toolbar gear that pushes the Settings stack (Search tab), like Ryu. */
const GearButton: React.FC = () => {
  const router = useIonRouter();
  return (
    <IonButtons slot="end">
      <IonButton onClick={() => router.push(routes.settings, 'forward', 'push')}>
        <IonIcon slot="icon-only" icon={settingsOutline} />
      </IonButton>
    </IonButtons>
  );
};

export default GearButton;
