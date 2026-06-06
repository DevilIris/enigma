import React, { useMemo } from 'react';
import {
  IonButton,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/react';
import { playCircle, downloadOutline } from 'ionicons/icons';
import type { Episode } from '../../models';

interface EpisodeListProps {
  episodes: Episode[];
  onPlay: (ep: Episode) => void;
  onDownload?: (ep: Episode) => void;
  busyHref?: string | null;
  reverse?: boolean;
}

const EpisodeList: React.FC<EpisodeListProps> = ({
  episodes,
  onPlay,
  onDownload,
  busyHref,
  reverse,
}) => {
  const ordered = useMemo(
    () => (reverse ? [...episodes].reverse() : episodes),
    [episodes, reverse]
  );

  return (
    <IonList>
      {ordered.map((ep) => (
        <IonItem key={ep.href} button onClick={() => onPlay(ep)} detail={false}>
          {busyHref === ep.href ? (
            <IonSpinner slot="start" name="crescent" />
          ) : (
            <IonIcon slot="start" icon={playCircle} color="primary" />
          )}
          <IonLabel>
            <h3>Episode {ep.number}</h3>
            {ep.title && <p>{ep.title}</p>}
          </IonLabel>
          {onDownload && (
            <IonButton
              slot="end"
              fill="clear"
              onClick={(e) => {
                e.stopPropagation();
                onDownload(ep);
              }}
            >
              <IonIcon slot="icon-only" icon={downloadOutline} />
            </IonButton>
          )}
        </IonItem>
      ))}
    </IonList>
  );
};

export default EpisodeList;
