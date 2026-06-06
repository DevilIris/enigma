import React, { useMemo, useState } from 'react';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonReorder,
  IonReorderGroup,
  IonThumbnail,
  IonTitle,
  IonToolbar,
  useIonRouter,
  type ItemReorderEventDetail,
} from '@ionic/react';
import {
  heartDislikeOutline,
  swapVerticalOutline,
  trashOutline,
} from 'ionicons/icons';
import EmptyState from '../../components/common/EmptyState';
import MediaCard from '../../components/common/MediaCard';
import { useTabBasePath } from '../../hooks/useTabBasePath';
import { useFavoritesStore } from '../../stores';
import { useIonActionSheet } from '@ionic/react';
import { routes } from '../../routes';
import type { FavoriteItem } from '../../models';

type SortMode = 'normal' | 'az' | 'za';

const LibraryPage: React.FC = () => {
  const router = useIonRouter();
  const base = useTabBasePath();
  const items = useFavoritesStore((s) => s.items);
  const remove = useFavoritesStore((s) => s.remove);
  const reorder = useFavoritesStore((s) => s.reorder);
  const [present] = useIonActionSheet();

  const [editMode, setEditMode] = useState(false);
  const [sort, setSort] = useState<SortMode>('normal');

  const displayed = useMemo(() => {
    if (editMode || sort === 'normal') return items;
    const copy = [...items];
    copy.sort((a, b) =>
      sort === 'az'
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );
    return copy;
  }, [items, sort, editMode]);

  const open = (f: FavoriteItem) =>
    f.metaId
      ? router.push(routes.animeMeta(base, f.metaId), 'forward', 'push')
      : router.push(
          routes.anime(base, f.source, f.href ?? f.id),
          'forward',
          'push'
        );

  const handleReorder = (e: CustomEvent<ItemReorderEventDetail>) => {
    reorder(e.detail.from, e.detail.to);
    e.detail.complete(false);
  };

  const openSort = () =>
    present({
      header: 'Sort',
      buttons: [
        { text: 'Default', handler: () => setSort('normal') },
        { text: 'Title A–Z', handler: () => setSort('az') },
        { text: 'Title Z–A', handler: () => setSort('za') },
        { text: 'Cancel', role: 'cancel' },
      ],
    });

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>Library</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openSort} disabled={editMode}>
              <IonIcon slot="icon-only" icon={swapVerticalOutline} />
            </IonButton>
            <IonButton
              onClick={() => setEditMode((v) => !v)}
              disabled={items.length === 0}
            >
              {editMode ? 'Done' : 'Edit'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Library</IonTitle>
          </IonToolbar>
        </IonHeader>

        {items.length === 0 ? (
          <EmptyState
            icon={heartDislikeOutline}
            title="No favorites yet"
            message="Tap the heart on an anime to keep it here."
          />
        ) : editMode ? (
          <IonList>
            <IonReorderGroup disabled={false} onIonItemReorder={handleReorder}>
              {displayed.map((f) => (
                <IonItem key={`${f.source}-${f.id}`}>
                  <IonThumbnail slot="start">
                    {f.coverUrl && <img src={f.coverUrl} alt={f.title} />}
                  </IonThumbnail>
                  <IonLabel>{f.title}</IonLabel>
                  <IonButton
                    fill="clear"
                    color="danger"
                    onClick={() => remove(f.id, f.source)}
                  >
                    <IonIcon slot="icon-only" icon={trashOutline} />
                  </IonButton>
                  <IonReorder slot="end" />
                </IonItem>
              ))}
            </IonReorderGroup>
          </IonList>
        ) : (
          <div className="enigma-grid">
            {displayed.map((f) => (
              <MediaCard
                key={`${f.source}-${f.id}`}
                title={f.title}
                coverUrl={f.coverUrl}
                onClick={() => open(f)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  remove(f.id, f.source);
                }}
              />
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default LibraryPage;
