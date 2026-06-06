import React, { useRef } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonRange,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
  useIonToast,
} from '@ionic/react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { useParams } from 'react-router';
import { ALL_SOURCES, AnimeListingService, SOURCE_META } from '../../models';
import {
  useSettingsStore,
  useAuthStore,
  useSearchHistoryStore,
  useDownloadsStore,
  hydrateAll,
} from '../../stores';
import { loginAniList } from '../../services/auth/anilistAuth';
import { createBackup, decodeBackup, encodeBackup, restoreBackup } from '../../services/backup/backup';
import { DEFAULT_PROXY_BASE } from '../../services/http/proxyConfig';
import { prefs } from '../../services/storage/preferences';
import { isNative } from '../../services/platform';
import { routes } from '../../routes';

const SECTION_TITLES: Record<string, string> = {
  account: 'Account',
  data: 'Data & Backup',
  general: 'General',
  appearance: 'Appearance',
  sources: 'Sources',
  player: 'Player',
  skip: 'AniSkip',
  translation: 'Translation',
  cast: 'Casting',
  proxy: 'Proxy',
  notifications: 'Notifications',
  about: 'About',
};

const SettingsSectionPage: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const settings = useSettingsStore((s) => s.settings);
  const set = useSettingsStore((s) => s.set);
  const aniListUser = useAuthStore((s) => s.aniListUser);
  const logoutAniList = useAuthStore((s) => s.logoutAniList);
  const clearSearchHistory = useSearchHistoryStore((s) => s.clear);
  const clearDownloads = useDownloadsStore((s) => s.clear);
  const [presentToast] = useIonToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const exportBackup = async () => {
    const backup = await createBackup(Date.now());
    const encoded = encodeBackup(backup);
    const filename = `enigma-${backup.createdAt}.albackup`;
    if (isNative()) {
      const { uri } = await Filesystem.writeFile({
        path: filename,
        directory: Directory.Documents,
        data: encoded,
        encoding: Encoding.UTF8,
        recursive: true,
      });
      await Share.share({ title: 'Enigma backup', url: uri }).catch(() => undefined);
    } else {
      const blob = new Blob([encoded], { type: 'application/octet-stream' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }
    presentToast({ message: 'Backup created', duration: 1500, color: 'success' });
  };

  const importBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const backup = decodeBackup(await file.text());
      await restoreBackup(backup);
      await hydrateAll();
      presentToast({ message: 'Backup restored', duration: 2000, color: 'success' });
    } catch {
      presentToast({ message: 'Invalid backup file', duration: 2500, color: 'danger' });
    }
  };

  const resetAll = async () => {
    await prefs.clear();
    await hydrateAll();
    presentToast({ message: 'All app data reset', duration: 1500 });
  };

  const toggle = (
    key: Parameters<typeof set>[0],
    label: string,
    value: boolean
  ) => (
    <IonItem>
      <IonLabel>{label}</IonLabel>
      <IonToggle
        slot="end"
        checked={value}
        onIonChange={(e) => set(key, e.detail.checked as never)}
      />
    </IonItem>
  );

  const renderSection = () => {
    switch (section) {
      case 'account':
        return (
          <IonList inset>
            <IonItem>
              <IonInput
                label="AniList client ID"
                labelPlacement="stacked"
                placeholder="e.g. 19551"
                value={settings.anilistClientId}
                onIonInput={(e) => set('anilistClientId', e.detail.value ?? '')}
              />
            </IonItem>
            {aniListUser ? (
              <>
                <IonItem>
                  <IonLabel>
                    <h2>AniList</h2>
                    <p>Signed in as {aniListUser}</p>
                  </IonLabel>
                </IonItem>
                <IonItem button onClick={() => void logoutAniList()}>
                  <IonLabel color="danger">Log out of AniList</IonLabel>
                </IonItem>
              </>
            ) : (
              <IonItem
                button
                disabled={!settings.anilistClientId}
                onClick={() => void loginAniList(settings.anilistClientId)}
              >
                <IonLabel color="primary">Log in with AniList</IonLabel>
              </IonItem>
            )}
            <IonItem lines="none">
              <IonNote>
                Register an AniList API client with redirect URL{' '}
                <code>enigma://anilist</code> and paste its client ID above.
                Signing in syncs your watch progress automatically.
              </IonNote>
            </IonItem>
          </IonList>
        );

      case 'data':
        return (
          <IonList inset>
            <IonItem button onClick={() => void exportBackup()}>
              <IonLabel>Create backup</IonLabel>
            </IonItem>
            <IonItem button onClick={() => fileRef.current?.click()}>
              <IonLabel>Import backup</IonLabel>
            </IonItem>
            <IonItem button onClick={() => clearSearchHistory()}>
              <IonLabel>Clear search history</IonLabel>
            </IonItem>
            <IonItem button onClick={() => clearDownloads()}>
              <IonLabel>Clear downloads list</IonLabel>
            </IonItem>
            <IonItem button onClick={() => void resetAll()}>
              <IonLabel color="danger">Reset all app data</IonLabel>
            </IonItem>
            <input
              ref={fileRef}
              type="file"
              accept=".albackup,application/octet-stream,text/plain"
              style={{ display: 'none' }}
              onChange={(e) => void importBackup(e)}
            />
          </IonList>
        );

      case 'general':
        return (
          <IonList inset>
            {toggle('autoPlay', 'Auto-play next', settings.autoPlay)}
            {toggle('alwaysLandscape', 'Always landscape', settings.alwaysLandscape)}
            {toggle('episodeSortingReverse', 'Reverse episode order', settings.episodeSortingReverse)}
            {toggle('mergeActivity', 'Merge continue-watching activity', settings.mergeActivity)}
          </IonList>
        );

      case 'appearance':
        return (
          <IonList inset>
            {toggle('syncTheme', 'Match system theme', settings.syncTheme)}
            <IonItem>
              <IonSelect
                label="Theme"
                disabled={settings.syncTheme}
                value={settings.theme}
                onIonChange={(e) => set('theme', e.detail.value)}
              >
                <IonSelectOption value="system">System</IonSelectOption>
                <IonSelectOption value="light">Light</IonSelectOption>
                <IonSelectOption value="dark">Dark</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        );

      case 'sources':
        return (
          <IonList inset>
            <IonItem>
              <IonSelect
                label="Streaming source"
                value={settings.selectedMediaSource}
                onIonChange={(e) => set('selectedMediaSource', e.detail.value)}
              >
                {ALL_SOURCES.map((s) => (
                  <IonSelectOption key={s} value={s}>
                    {SOURCE_META[s].flag} {SOURCE_META[s].label}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonSelect
                label="Listing service"
                value={settings.selectedAnimeListingService}
                onIonChange={(e) => set('selectedAnimeListingService', e.detail.value)}
              >
                {Object.values(AnimeListingService).map((s) => (
                  <IonSelectOption key={s} value={s}>
                    {s}
                  </IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
          </IonList>
        );

      case 'player':
        return (
          <IonList inset>
            <IonItem>
              <IonSelect
                label="Player"
                value={settings.mediaPlayerSelection}
                onIonChange={(e) => set('mediaPlayerSelection', e.detail.value)}
              >
                {['Default', 'WebPlayer', 'VLC', 'Infuse', 'OutPlayer', 'nPlayer'].map((p) => (
                  <IonSelectOption key={p} value={p}>{p}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonSelect
                label="Quality"
                value={settings.playbackQuality}
                onIonChange={(e) => set('playbackQuality', e.detail.value)}
              >
                {['Auto', '1080p', '720p', '480p', '360p'].map((q) => (
                  <IonSelectOption key={q} value={q}>{q}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonSelect
                label="Audio"
                value={settings.audioPreference}
                onIonChange={(e) => set('audioPreference', e.detail.value)}
              >
                {['Sub', 'Dub', 'Raw', 'Always Ask'].map((a) => (
                  <IonSelectOption key={a} value={a}>{a}</IonSelectOption>
                ))}
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonRange
                label={`Hold speed: ${settings.holdSpeedPlayer.toFixed(2)}x`}
                min={0.5}
                max={2}
                step={0.25}
                snaps
                value={settings.holdSpeedPlayer}
                onIonChange={(e) => set('holdSpeedPlayer', e.detail.value as number)}
              />
            </IonItem>
            {toggle('browserPlayer', 'Browser player', settings.browserPlayer)}
            {toggle('otherFormats', 'Allow other formats', settings.otherFormats)}
          </IonList>
        );

      case 'skip':
        return (
          <IonList inset>
            {toggle('autoSkipIntro', 'Auto-skip intro', settings.autoSkipIntro)}
            {toggle('autoSkipOutro', 'Auto-skip outro', settings.autoSkipOutro)}
            {toggle('skipFeedback', 'Skip feedback', settings.skipFeedback)}
            <IonItem>
              <IonInput
                label="AniSkip instance"
                labelPlacement="stacked"
                value={settings.aniSkipInstanceURL}
                onIonInput={(e) => set('aniSkipInstanceURL', e.detail.value ?? '')}
              />
            </IonItem>
          </IonList>
        );

      case 'translation':
        return (
          <IonList inset>
            {toggle('useGoogleTranslate', 'Translate subtitles', settings.useGoogleTranslate)}
            <IonItem>
              <IonInput
                label="Target language"
                labelPlacement="stacked"
                value={settings.translationLanguage}
                onIonInput={(e) => set('translationLanguage', e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem>
              <IonInput
                label="Custom translator URL"
                labelPlacement="stacked"
                value={settings.customTranslatorURL}
                onIonInput={(e) => set('customTranslatorURL', e.detail.value ?? '')}
              />
            </IonItem>
          </IonList>
        );

      case 'cast':
        return (
          <IonList inset>
            {toggle('fullTitleCast', 'Full title while casting', settings.fullTitleCast)}
            {toggle('animeImageCast', 'Show image while casting', settings.animeImageCast)}
            <IonItem>
              <IonSelect
                label="Streaming method"
                value={settings.castStreamingMethod}
                onIonChange={(e) => set('castStreamingMethod', e.detail.value)}
              >
                <IonSelectOption value="Buffered">Buffered</IonSelectOption>
                <IonSelectOption value="Live">Live</IonSelectOption>
              </IonSelect>
            </IonItem>
          </IonList>
        );

      case 'proxy':
        return (
          <IonList inset>
            {toggle('proxyEnabled', 'Use web proxy (browser)', settings.proxyEnabled)}
            <IonItem>
              <IonSelect
                label="Custom proxy mode"
                disabled={!settings.proxyEnabled}
                value={settings.proxyMode === 'off' ? 'param' : settings.proxyMode}
                onIonChange={(e) => set('proxyMode', e.detail.value)}
              >
                <IonSelectOption value="param">URL param (?url=)</IonSelectOption>
                <IonSelectOption value="prefix">Prefix</IonSelectOption>
              </IonSelect>
            </IonItem>
            <IonItem>
              <IonInput
                label="Custom proxy URL"
                labelPlacement="stacked"
                placeholder={DEFAULT_PROXY_BASE}
                disabled={!settings.proxyEnabled}
                value={settings.proxyBaseUrl}
                onIonInput={(e) => set('proxyBaseUrl', e.detail.value ?? '')}
              />
            </IonItem>
            <IonItem lines="none">
              <IonNote>
                Leave the URL blank to use the built-in default proxy. Web scraping
                is best-effort (GET only); video streaming and POST-based sources
                need the native app or your own streaming proxy.
              </IonNote>
            </IonItem>
          </IonList>
        );

      case 'notifications':
        return (
          <IonList inset>
            {toggle('episodeNotifications', 'New-episode notifications', settings.episodeNotifications)}
          </IonList>
        );

      case 'about':
        return (
          <IonList inset>
            <IonItem>
              <IonLabel>
                <h2>Enigma</h2>
                <p>An anime client — a port of Ryu to Ionic + Capacitor.</p>
              </IonLabel>
            </IonItem>
            <IonItem
              href="https://github.com/DevilIris/Ryu-preservation"
              target="_blank"
              detail
            >
              <IonLabel>Original project (Ryu-preservation)</IonLabel>
            </IonItem>
          </IonList>
        );

      default:
        return (
          <div style={{ padding: 16 }}>
            <IonText color="medium">Unknown settings section.</IonText>
          </div>
        );
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref={routes.settings} />
          </IonButtons>
          <IonTitle>{SECTION_TITLES[section] ?? 'Settings'}</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>{renderSection()}</IonContent>
    </IonPage>
  );
};

export default SettingsSectionPage;
