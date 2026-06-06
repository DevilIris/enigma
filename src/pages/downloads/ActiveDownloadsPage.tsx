import React from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonProgressBar,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { closeOutline, cloudDownloadOutline } from 'ionicons/icons';
import EmptyState from '../../components/common/EmptyState';
import { useDownloadsStore } from '../../stores';
import { DownloadManager } from '../../media/downloads/DownloadManager';
import { routes } from '../../routes';

const ActiveDownloadsPage: React.FC = () => {
  const active = useDownloadsStore((s) => s.active);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={routes.downloads} />
          </IonButtons>
          <IonTitle>Active Downloads</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {active.length === 0 ? (
          <EmptyState
            icon={cloudDownloadOutline}
            title="No active downloads"
            message="Start one with the download button next to an episode."
          />
        ) : (
          <IonList>
            {active.map((d) => (
              <IonItem key={d.id}>
                <IonLabel>
                  <h2>{d.title}</h2>
                  <IonProgressBar value={d.progress} />
                  <p>{Math.round(d.progress * 100)}% · {d.state}</p>
                </IonLabel>
                <IonButton
                  slot="end"
                  fill="clear"
                  color="danger"
                  onClick={() => DownloadManager.cancel(d.id)}
                >
                  <IonIcon slot="icon-only" icon={closeOutline} />
                </IonButton>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default ActiveDownloadsPage;
