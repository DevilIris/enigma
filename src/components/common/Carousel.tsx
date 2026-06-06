import React from 'react';
import { IonSkeletonText } from '@ionic/react';
import type { Anime } from '../../models';
import MediaCard from './MediaCard';
import SectionHeader from './SectionHeader';

interface CarouselProps {
  title: string;
  items: Anime[];
  loading?: boolean;
  error?: boolean;
  onSelect: (a: Anime) => void;
}

const SKELETON_COUNT = 6;

const Carousel: React.FC<CarouselProps> = ({
  title,
  items,
  loading,
  error,
  onSelect,
}) => {
  if (!loading && !error && items.length === 0) return null;

  return (
    <section>
      <SectionHeader title={title} />
      {error && items.length === 0 ? (
        <p style={{ padding: '0 16px', color: 'var(--ion-color-step-600)' }}>
          Couldn’t load this section.
        </p>
      ) : (
        <div className="enigma-rail">
          {loading && items.length === 0
            ? Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <div className="enigma-card" key={`s-${i}`}>
                  <div className="enigma-poster">
                    <IonSkeletonText
                      animated
                      style={{ width: '100%', height: '100%', margin: 0 }}
                    />
                  </div>
                  <IonSkeletonText animated style={{ width: '80%' }} />
                </div>
              ))
            : items.map((a) => (
                <MediaCard
                  key={`${a.source ?? 'meta'}-${a.id}`}
                  title={a.title}
                  coverUrl={a.coverUrl}
                  onClick={() => onSelect(a)}
                />
              ))}
        </div>
      )}
    </section>
  );
};

export default Carousel;
