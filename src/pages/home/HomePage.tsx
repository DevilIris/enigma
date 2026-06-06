import React, { useCallback, useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  useIonRouter,
  type RefresherEventDetail,
} from '@ionic/react';
import Carousel from '../../components/common/Carousel';
import SectionHeader from '../../components/common/SectionHeader';
import MediaCard from '../../components/common/MediaCard';
import { useTabBasePath } from '../../hooks/useTabBasePath';
import { useSettingsStore, useContinueWatchingStore } from '../../stores';
import { metadataProvider } from '../../services/metadata';
import type { Anime } from '../../models';
import { routes } from '../../routes';

interface HomeRows {
  airing: Anime[];
  trending: Anime[];
  seasonal: Anime[];
  popular: Anime[];
}

const EMPTY: HomeRows = { airing: [], trending: [], seasonal: [], popular: [] };

const HomePage: React.FC = () => {
  const router = useIonRouter();
  const base = useTabBasePath();
  const service = useSettingsStore((s) => s.settings.selectedAnimeListingService);
  const cwItems = useContinueWatchingStore((s) => s.items);
  const cwRemove = useContinueWatchingStore((s) => s.remove);

  const [rows, setRows] = useState<HomeRows>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    const provider = metadataProvider(service);
    const [airing, trending, seasonal, popular] = await Promise.all([
      provider.getAiring().catch(() => []),
      provider.getTrending().catch(() => []),
      provider.getSeasonal().catch(() => []),
      provider.getPopular().catch(() => []),
    ]);
    setRows({ airing, trending, seasonal, popular });
    if (![airing, trending, seasonal, popular].some((r) => r.length)) {
      setError(true);
    }
    setLoading(false);
  }, [service]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const handleRefresh = async (e: CustomEvent<RefresherEventDetail>) => {
    await load();
    e.detail.complete();
  };

  const openMeta = (a: Anime) =>
    router.push(routes.animeMeta(base, a.metaId ?? a.id), 'forward', 'push');

  // Continue-watching items still worth resuming (>15% remaining).
  const cwVisible = cwItems.filter(
    (i) => i.totalTime > 0 && (i.totalTime - i.lastPlayedTime) / i.totalTime > 0.15
  );

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Home</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Home</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {cwVisible.length > 0 && (
          <section>
            <SectionHeader title="Continue Watching" />
            <div className="enigma-rail">
              {cwVisible.map((i) => (
                <MediaCard
                  key={i.fullURL}
                  title={i.animeTitle}
                  subtitle={`Episode ${i.episodeNumber}`}
                  coverUrl={i.imageUrl}
                  progress={i.lastPlayedTime / i.totalTime}
                  onClick={() =>
                    i.metaId
                      ? router.push(
                          routes.animeMeta(base, i.metaId),
                          'forward',
                          'push'
                        )
                      : router.push(
                          routes.anime(base, i.source, i.href ?? i.fullURL),
                          'forward',
                          'push'
                        )
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cwRemove(i.fullURL);
                  }}
                />
              ))}
            </div>
          </section>
        )}

        <Carousel title="Airing" items={rows.airing} loading={loading} error={error} onSelect={openMeta} />
        <Carousel title="Trending" items={rows.trending} loading={loading} error={error} onSelect={openMeta} />
        <Carousel title="Seasonal" items={rows.seasonal} loading={loading} error={error} onSelect={openMeta} />
        <Carousel title="Popular" items={rows.popular} loading={loading} error={error} onSelect={openMeta} />

        <div style={{ height: 24 }} />
      </IonContent>
    </IonPage>
  );
};

export default HomePage;
