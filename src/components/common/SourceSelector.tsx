import React from 'react';
import { IonButton, IonIcon, useIonActionSheet } from '@ionic/react';
import { chevronDownOutline } from 'ionicons/icons';
import { ALL_SOURCES, SOURCE_META } from '../../models';
import { useSettingsStore } from '../../stores';

/** Compact button that opens an action sheet to switch the active source. */
const SourceSelector: React.FC = () => {
  const source = useSettingsStore((s) => s.settings.selectedMediaSource);
  const setSetting = useSettingsStore((s) => s.set);
  const [present] = useIonActionSheet();

  const open = () =>
    present({
      header: 'Select Source',
      buttons: [
        ...ALL_SOURCES.map((src) => ({
          text: `${SOURCE_META[src].flag}  ${SOURCE_META[src].label}`,
          handler: () => setSetting('selectedMediaSource', src),
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });

  return (
    <IonButton fill="clear" size="small" onClick={open}>
      {SOURCE_META[source].flag}&nbsp;{SOURCE_META[source].label}
      <IonIcon slot="end" icon={chevronDownOutline} />
    </IonButton>
  );
};

export default SourceSelector;
