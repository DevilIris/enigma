import React, { useEffect } from 'react';
import { Redirect, Route } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import {
  homeOutline,
  libraryOutline,
  downloadOutline,
  searchOutline,
} from 'ionicons/icons';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

/* Dark palette via the `.ion-palette-dark` class (toggled from settings) */
import '@ionic/react/css/palettes/dark.class.css';

/* Enigma theme */
import './theme/variables.css';
import './theme/global.css';

import HomePage from './pages/home/HomePage';
import LibraryPage from './pages/library/LibraryPage';
import DownloadsPage from './pages/downloads/DownloadsPage';
import ActiveDownloadsPage from './pages/downloads/ActiveDownloadsPage';
import SearchPage from './pages/search/SearchPage';
import SearchResultsPage from './pages/search/SearchResultsPage';
import AnimeDetailsPage from './pages/anime/AnimeDetailsPage';
import SettingsRootPage from './pages/settings/SettingsRootPage';
import SettingsSectionPage from './pages/settings/SettingsSectionPage';
import OnboardingPager from './pages/onboarding/OnboardingPager';
import SplashScreen from './components/common/SplashScreen';
import PlayerModal from './media/player/PlayerModal';

import { useBootstrap, useSettingsStore, useAuthStore } from './stores';
import { extractTokenFromUrl, closeAuthBrowser } from './services/auth/anilistAuth';
import { routes } from './routes';

setupIonicReact({ mode: 'ios' });

const Tabs: React.FC = () => (
  <IonTabs>
    <IonRouterOutlet>
      {/* Home stack */}
      <Route exact path={routes.home}>
        <HomePage />
      </Route>
      <Route exact path="/tabs/home/anime/:source/:id">
        <AnimeDetailsPage />
      </Route>

      {/* Library stack */}
      <Route exact path={routes.library}>
        <LibraryPage />
      </Route>
      <Route exact path="/tabs/library/anime/:source/:id">
        <AnimeDetailsPage />
      </Route>

      {/* Downloads stack */}
      <Route exact path={routes.downloads}>
        <DownloadsPage />
      </Route>
      <Route exact path={routes.activeDownloads}>
        <ActiveDownloadsPage />
      </Route>

      {/* Search stack (+ settings) */}
      <Route exact path={routes.search}>
        <SearchPage />
      </Route>
      <Route exact path={routes.searchResults}>
        <SearchResultsPage />
      </Route>
      <Route exact path="/tabs/search/anime/:source/:id">
        <AnimeDetailsPage />
      </Route>
      <Route exact path={routes.settings}>
        <SettingsRootPage />
      </Route>
      <Route exact path="/tabs/search/settings/:section">
        <SettingsSectionPage />
      </Route>

      <Route exact path={routes.tabs}>
        <Redirect to={routes.home} />
      </Route>
      <Route exact path="/">
        <Redirect to={routes.home} />
      </Route>
    </IonRouterOutlet>

    <IonTabBar slot="bottom">
      <IonTabButton tab="home" href={routes.home}>
        <IonIcon aria-hidden="true" icon={homeOutline} />
        <IonLabel>Home</IonLabel>
      </IonTabButton>
      <IonTabButton tab="library" href={routes.library}>
        <IonIcon aria-hidden="true" icon={libraryOutline} />
        <IonLabel>Library</IonLabel>
      </IonTabButton>
      <IonTabButton tab="downloads" href={routes.downloads}>
        <IonIcon aria-hidden="true" icon={downloadOutline} />
        <IonLabel>Downloads</IonLabel>
      </IonTabButton>
      <IonTabButton tab="search" href={routes.search}>
        <IonIcon aria-hidden="true" icon={searchOutline} />
        <IonLabel>Search</IonLabel>
      </IonTabButton>
    </IonTabBar>
  </IonTabs>
);

const App: React.FC = () => {
  const ready = useBootstrap();
  const showOnboarding = useSettingsStore((s) => s.settings.showOnboarding);

  // Handle the AniList OAuth callback (web URL fragment + native deep link).
  useEffect(() => {
    const webToken = extractTokenFromUrl(window.location.href);
    if (webToken) {
      void useAuthStore.getState().setAniListToken(webToken);
      window.history.replaceState(null, '', window.location.pathname);
    }
    let remove: (() => void) | undefined;
    void CapApp.addListener('appUrlOpen', ({ url }) => {
      const token = extractTokenFromUrl(url);
      if (token) {
        void useAuthStore.getState().setAniListToken(token);
        void closeAuthBrowser();
      }
    }).then((h) => {
      remove = () => h.remove();
    });
    return () => remove?.();
  }, []);

  return (
    <IonApp>
      <IonReactRouter>
        {!ready ? (
          <SplashScreen />
        ) : showOnboarding ? (
          <OnboardingPager />
        ) : (
          <Tabs />
        )}
      </IonReactRouter>
      <PlayerModal />
    </IonApp>
  );
};

export default App;
