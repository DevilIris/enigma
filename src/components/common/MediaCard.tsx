import React from 'react';
import { imageOutline } from 'ionicons/icons';
import { IonIcon } from '@ionic/react';

interface MediaCardProps {
  title: string;
  coverUrl?: string;
  subtitle?: string;
  /** 0..1 watch progress, renders a strip along the poster bottom. */
  progress?: number;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

/** A poster card used in carousels and grids. Presentational only. */
const MediaCard: React.FC<MediaCardProps> = ({
  title,
  coverUrl,
  subtitle,
  progress,
  onClick,
  onContextMenu,
}) => (
  <div
    className="enigma-card"
    onClick={onClick}
    onContextMenu={onContextMenu}
    role="button"
  >
    <div className="enigma-poster">
      {coverUrl ? (
        <img src={coverUrl} alt={title} loading="lazy" />
      ) : (
        <div className="enigma-empty" style={{ height: '100%', padding: 0 }}>
          <IonIcon icon={imageOutline} />
        </div>
      )}
      {progress != null && progress > 0 && (
        <div className="enigma-progress-strip">
          <span style={{ width: `${Math.min(100, progress * 100)}%` }} />
        </div>
      )}
    </div>
    <p className="enigma-card-title">{title}</p>
    {subtitle && (
      <p className="enigma-card-title" style={{ opacity: 0.6, fontSize: '0.72rem' }}>
        {subtitle}
      </p>
    )}
  </div>
);

export default MediaCard;
