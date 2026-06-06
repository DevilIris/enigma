import React, { useEffect, useState } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonNote,
  IonPage,
  IonSkeletonText,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/react';
import { useLocation } from 'react-router';
import { searchOutline } from 'ionicons/icons';
import MediaCard from '../../components/common/MediaCard';
import EmptyState from '../../components/common/EmptyState';
import { useTabBasePath } from '../../hooks/useTabBasePath';
import { useSettingsStore } from '../../stores';
import { metadataProvider } from '../../services/metadata';
import { getSource } from '../../services/sources';
import { isNative } from '../../services/platform';
import { isProxyConfigured } from '../../services/http/proxyConfig';
import { SOURCE_META } from '../../models';
import { routes } from '../../routes';

interface ResultCard {
  key: string;
  title: string;
  coverUrl?: string;
  to: string;
}

const SearchResultsPage: React.FC = () => {
  const router = useIonRouter();
  const base = useTabBasePath();
  const location = useLocation();
  const service = useSettingsStore((s) => s.settings.selectedAnimeListingService);
  const selectedSource = useSettingsStore((s) => s.settings.selectedMediaSource);
  const query = new URLSearchParams(location.search).get('q') ?? '';

  const [results, setResults] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [via, setVia] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const run = async (): Promise<ResultCard[]> => {
      const src = getSource(selectedSource);
      const useSource = (isNative() || isProxyConfigured()) && src?.playable;
      if (useSource && src) {
        setVia(`${SOURCE_META[selectedSource].label}`);
        const r = await src.search(query);
        return r.map((x) => ({
          key: x.href,
          title: x.title,
          coverUrl: x.coverUrl,
          to: routes.anime(base, x.source, x.href),
        }));
      }
      setVia(service);
      const r = await metadataProvider(service).search(query);
      return r.map((a) => ({
        key: a.id,
        title: a.title,
        coverUrl: a.coverUrl,
        to: routes.animeMeta(base, a.metaId ?? a.id),
      }));
    };

    run()
      .then((r) => !cancelled && setResults(r))
      .catch(() => !cancelled && setResults([]))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [query, service, selectedSource, base]);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={routes.search} />
          </IonButtons>
          <IonTitle>{query}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {via && !loading && (
          <IonNote style={{ display: 'block', padding: '8px 16px 0' }}>
            via {via}
          </IonNote>
        )}
        {loading ? (
          <div className="enigma-grid">
            {Array.from({ length: 9 }).map((_, i) => (
              <div className="enigma-card" key={i}>
                <div className="enigma-poster">
                  <IonSkeletonText animated style={{ width: '100%', height: '100%', margin: 0 }} />
                </div>
                <IonSkeletonText animated style={{ width: '80%' }} />
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <EmptyState icon={searchOutline} title="No results" message={`Nothing found for “${query}”.`} />
        ) : (
          <div className="enigma-grid">
            {results.map((r) => (
              <MediaCard
                key={r.key}
                title={r.title}
                coverUrl={r.coverUrl}
                onClick={() => router.push(r.to, 'forward', 'push')}
              />
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default SearchResultsPage;
