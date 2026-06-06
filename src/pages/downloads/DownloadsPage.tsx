import React from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { cloudDownloadOutline, downloadOutline, trashOutline } from 'ionicons/icons';
import EmptyState from '../../components/common/EmptyState';
import { useDownloadsStore, usePlayerStore, useSettingsStore } from '../../stores';
import { localPlaybackUrl } from '../../media/downloads/DownloadManager';
import { isNative } from '../../services/platform';
import { formatBytes } from '../../utils/format';
import { routes } from '../../routes';
import type { DownloadItem } from '../../models';

const DownloadsPage: React.FC = () => {
  const router = useIonRouter();
  const items = useDownloadsStore((s) => s.items);
  const active = useDownloadsStore((s) => s.active);
  const removeCompleted = useDownloadsStore((s) => s.removeCompleted);
  const play = usePlayerStore((s) => s.play);
  const fallbackSource = useSettingsStore((s) => s.settings.selectedMediaSource);

  const playLocal = (d: DownloadItem) => {
    play({
      video: { url: localPlaybackUrl(d.fileUri), type: d.type ?? 'mp4' },
      meta: {
        animeTitle: d.title,
        episodeNumber: d.episodeNumber ?? 1,
        fullURL: d.fileUri,
        source: d.source ?? fallbackSource,
      },
    });
  };

  const remove = async (d: DownloadItem) => {
    if (isNative() && d.path) {
      await Filesystem.deleteFile({ path: d.path, directory: Directory.Data }).catch(() => undefined);
    }
    removeCompleted(d.id);
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Downloads</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => router.push(routes.activeDownloads, 'forward', 'push')}>
              <IonIcon slot="icon-only" icon={cloudDownloadOutline} />
              {active.length > 0 && <IonNote color="primary">{active.length}</IonNote>}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Downloads</IonTitle>
          </IonToolbar>
        </IonHeader>

        {items.length === 0 ? (
          <EmptyState
            icon={downloadOutline}
            title="No downloads"
            message="Looks like a black hole has been here! Download episodes to watch offline."
          />
        ) : (
          <IonList>
            {items.map((d) => (
              <IonItemSliding key={d.id}>
                <IonItem button onClick={() => playLocal(d)}>
                  <IonLabel>
                    <h2>{d.title}</h2>
                    {d.episodeNumber != null && <p>Episode {d.episodeNumber}</p>}
                  </IonLabel>
                  {d.sizeBytes != null && <IonNote slot="end">{formatBytes(d.sizeBytes)}</IonNote>}
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption color="danger" onClick={() => void remove(d)}>
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
};

export default DownloadsPage;
