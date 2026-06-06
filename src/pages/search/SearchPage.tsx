import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonButton,
  IonNote,
  IonPage,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { timeOutline, closeOutline } from 'ionicons/icons';
import GearButton from '../../components/common/GearButton';
import EmptyState from '../../components/common/EmptyState';
import { searchOutline } from 'ionicons/icons';
import { useSearchHistoryStore, useSettingsStore } from '../../stores';
import { routes } from '../../routes';

const SearchPage: React.FC = () => {
  const router = useIonRouter();
  const [value, setValue] = useState('');
  const history = useSearchHistoryStore((s) => s.items);
  const pushHistory = useSearchHistoryStore((s) => s.push);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory = useSearchHistoryStore((s) => s.clear);
  const source = useSettingsStore((s) => s.settings.selectedMediaSource);

  const submit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    pushHistory(q, source);
    router.push(`${routes.searchResults}?q=${encodeURIComponent(q)}`, 'forward', 'push');
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Search</IonTitle>
          <GearButton />
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={value}
            placeholder="Search anime"
            onIonInput={(e) => setValue(e.detail.value ?? '')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit(value);
            }}
            enterkeyhint="search"
          />
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {history.length === 0 ? (
          <EmptyState
            icon={searchOutline}
            title="Search for anime"
            message="Your recent searches will appear here."
          />
        ) : (
          <IonList>
            <IonListHeader>
              <IonLabel>Recent</IonLabel>
              <IonButton onClick={clearHistory}>Clear</IonButton>
            </IonListHeader>
            {history.map((h) => (
              <IonItem
                key={`${h.source}-${h.query}`}
                button
                onClick={() => {
                  setValue(h.query);
                  submit(h.query);
                }}
              >
                <IonIcon slot="start" icon={timeOutline} />
                <IonLabel>{h.query}</IonLabel>
                <IonNote slot="end">{h.source}</IonNote>
                <IonButton
                  slot="end"
                  fill="clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeHistory(h.query, h.source);
                  }}
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

export default SearchPage;
