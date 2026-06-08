import React, { useEffect, useState } from 'react';
import {
  IonChip,
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
import { timeOutline, closeOutline, flameOutline, searchOutline } from 'ionicons/icons';
import GearButton from '../../components/common/GearButton';
import EmptyState from '../../components/common/EmptyState';
import { useSearchHistoryStore, useSettingsStore } from '../../stores';
import { isNative } from '../../services/platform';
import { isProxyConfigured } from '../../services/http/proxyConfig';
import { animeNanaGenres, ANIMENANA_GENRES } from '../../services/sources/animenana';
import { routes } from '../../routes';

const SearchPage: React.FC = () => {
  const router = useIonRouter();
  const [value, setValue] = useState('');
  const history = useSearchHistoryStore((s) => s.items);
  const pushHistory = useSearchHistoryStore((s) => s.push);
  const removeHistory = useSearchHistoryStore((s) => s.remove);
  const clearHistory = useSearchHistoryStore((s) => s.clear);
  const source = useSettingsStore((s) => s.settings.selectedMediaSource);

  // Discovery (browse by genre / trending) is scraped from AnimeNana, so it
  // only works where scraping does: native, the dev /__proxy, or a user proxy.
  const canBrowse = isNative() || isProxyConfigured();
  const [genres, setGenres] = useState<string[]>(ANIMENANA_GENRES);
  useEffect(() => {
    if (!canBrowse) return;
    let cancelled = false;
    animeNanaGenres().then((g) => !cancelled && g.length && setGenres(g));
    return () => {
      cancelled = true;
    };
  }, [canBrowse]);

  const submit = (query: string) => {
    const q = query.trim();
    if (!q) return;
    pushHistory(q, source);
    router.push(`${routes.searchResults}?q=${encodeURIComponent(q)}`, 'forward', 'push');
  };
  const browse = (params: string) =>
    router.push(`${routes.searchResults}?${params}`, 'forward', 'push');

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
        {canBrowse && (
          <>
            <IonListHeader>
              <IonLabel>Browse</IonLabel>
            </IonListHeader>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 12px 12px' }}>
              <IonChip color="primary" onClick={() => browse('trending=1')}>
                <IonIcon icon={flameOutline} />
                <IonLabel>Trending</IonLabel>
              </IonChip>
              {genres.map((g) => (
                <IonChip key={g} outline onClick={() => browse(`genre=${encodeURIComponent(g)}`)}>
                  <IonLabel>{g}</IonLabel>
                </IonChip>
              ))}
            </div>
          </>
        )}
        {history.length === 0 ? (
          !canBrowse && (
            <EmptyState
              icon={searchOutline}
              title="Search for anime"
              message="Your recent searches will appear here."
            />
          )
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
