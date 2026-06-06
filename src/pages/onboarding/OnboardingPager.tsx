import React, { useRef, useState } from 'react';
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/react';
import {
  sparklesOutline,
  globeOutline,
  syncOutline,
  notificationsOutline,
  lockClosedOutline,
} from 'ionicons/icons';
import { useSettingsStore } from '../../stores';

interface Slide {
  icon: string;
  title: string;
  text: string;
}

const SLIDES: Slide[] = [
  {
    icon: sparklesOutline,
    title: 'Welcome to Enigma',
    text: 'A simple way to enjoy and watch anime — no ads, no distractions.',
  },
  {
    icon: globeOutline,
    title: 'Many sources',
    text: 'Browse and stream from a wide range of providers around the world.',
  },
  {
    icon: syncOutline,
    title: 'Track your progress',
    text: 'Connect AniList or Kitsu to keep your watch list in sync.',
  },
  {
    icon: notificationsOutline,
    title: 'Never miss an episode',
    text: 'Get notified when new episodes of your favorites drop.',
  },
  {
    icon: lockClosedOutline,
    title: 'Yours, privately',
    text: 'Your library and history stay on your device.',
  },
];

const OnboardingPager: React.FC = () => {
  const finish = () => useSettingsStore.getState().set('showOnboarding', false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const next = () => {
    if (isLast) return finish();
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: (index + 1) * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <IonPage>
      <IonContent fullscreen scrollY={false}>
        <div style={{ position: 'absolute', top: 'max(16px, env(safe-area-inset-top))', right: 16, zIndex: 10 }}>
          <IonButton fill="clear" size="small" onClick={finish}>
            Skip
          </IonButton>
        </div>

        <div
          ref={scrollerRef}
          onScroll={onScroll}
          style={{
            display: 'flex',
            height: '100%',
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
          }}
        >
          {SLIDES.map((s) => (
            <div
              key={s.title}
              style={{
                flex: '0 0 100%',
                scrollSnapAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '0 32px 120px',
                gap: 18,
              }}
            >
              <IonIcon icon={s.icon} style={{ fontSize: 96, color: 'var(--enigma-accent)' }} />
              <h1 style={{ margin: 0 }}>{s.title}</h1>
              <p style={{ margin: 0, opacity: 0.7, maxWidth: 360, lineHeight: 1.5 }}>{s.text}</p>
            </div>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 24,
            right: 24,
            bottom: 'max(24px, env(safe-area-inset-bottom))',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', gap: 8 }}>
            {SLIDES.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background:
                    i === index ? 'var(--enigma-accent)' : 'var(--ion-color-step-300)',
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
          <IonButton expand="block" style={{ width: '100%' }} onClick={next}>
            {isLast ? 'Start Watching' : 'Continue'}
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default OnboardingPager;
