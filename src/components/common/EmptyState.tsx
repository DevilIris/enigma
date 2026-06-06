import React from 'react';
import { IonIcon } from '@ionic/react';

interface EmptyStateProps {
  icon: string;
  title: string;
  message?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message }) => (
  <div className="enigma-empty">
    <IonIcon icon={icon} />
    <h3 style={{ margin: 0 }}>{title}</h3>
    {message && <p style={{ margin: 0, fontSize: '0.85rem' }}>{message}</p>}
  </div>
);

export default EmptyState;
