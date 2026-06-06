import React from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import {
  colorPaletteOutline,
  serverOutline,
  playCircleOutline,
  playSkipForwardOutline,
  languageOutline,
  tvOutline,
  globeOutline,
  notificationsOutline,
  optionsOutline,
  informationCircleOutline,
  personCircleOutline,
  saveOutline,
} from 'ionicons/icons';
import { routes } from '../../routes';

const SECTIONS: { key: string; title: string; icon: string; note?: string }[] = [
  { key: 'account', title: 'Account', icon: personCircleOutline },
  { key: 'data', title: 'Data & Backup', icon: saveOutline },
  { key: 'general', title: 'General', icon: optionsOutline },
  { key: 'appearance', title: 'Appearance', icon: colorPaletteOutline },
  { key: 'sources', title: 'Sources', icon: serverOutline },
  { key: 'player', title: 'Player', icon: playCircleOutline },
  { key: 'skip', title: 'AniSkip', icon: playSkipForwardOutline },
  { key: 'translation', title: 'Translation', icon: languageOutline },
  { key: 'cast', title: 'Casting', icon: tvOutline },
  { key: 'proxy', title: 'Proxy', icon: globeOutline },
  { key: 'notifications', title: 'Notifications', icon: notificationsOutline },
  { key: 'about', title: 'About', icon: informationCircleOutline },
];

const SettingsRootPage: React.FC = () => (
  <IonPage>
    <IonHeader translucent>
      <IonToolbar>
        <IonButtons slot="start">
          <IonBackButton defaultHref={routes.search} />
        </IonButtons>
        <IonTitle>Settings</IonTitle>
      </IonToolbar>
    </IonHeader>
    <IonContent fullscreen>
      <IonHeader collapse="condense">
        <IonToolbar>
          <IonTitle size="large">Settings</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonList inset>
        {SECTIONS.map((s) => (
          <IonItem key={s.key} routerLink={routes.settingsSection(s.key)} detail>
            <IonIcon slot="start" icon={s.icon} color="primary" />
            <IonLabel>{s.title}</IonLabel>
            {s.note && <IonNote slot="end">{s.note}</IonNote>}
          </IonItem>
        ))}
      </IonList>
    </IonContent>
  </IonPage>
);

export default SettingsRootPage;
