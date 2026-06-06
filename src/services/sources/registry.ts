import { MediaSource } from '../../models';
import type { Source } from './types';
import { gogoanime } from './gogoanime';
import { hianime } from './hianime';
import { animeflv } from './animeflv';
import { animesama } from './animesama';
import { animenana } from './animenana';
import { anilibria } from './anilibria';
import {
  animeworld,
  animefire,
  kuramanime,
  anime3rb,
  tokyoinsider,
  anibunker,
  animeheaven,
  animesrbija,
  animebalkan,
  aniworld,
  anivibe,
  animeunity,
} from './moreSources';

/** Implemented sources, keyed by MediaSource (Ryu's enum-dispatch equivalent). */
const registry: Partial<Record<MediaSource, Source>> = {
  [MediaSource.GoGoAnime]: gogoanime, // English
  [MediaSource.HiAnime]: hianime, // English (JSON API)
  [MediaSource.AnimeNana]: animenana, // English
  [MediaSource.AnimeFLV]: animeflv, // Spanish
  [MediaSource.AnimeSama]: animesama, // French
  [MediaSource.AnimeWorld]: animeworld,
  [MediaSource.AnimeFire]: animefire,
  [MediaSource.Kuramanime]: kuramanime,
  [MediaSource.Anime3rb]: anime3rb,
  [MediaSource.TokyoInsider]: tokyoinsider,
  [MediaSource.AniBunker]: anibunker,
  [MediaSource.AnimeHeaven]: animeheaven,
  [MediaSource.AnimeSRBIJA]: animesrbija,
  [MediaSource.AnimeBalkan]: animebalkan,
  [MediaSource.AniWorld]: aniworld,
  [MediaSource.AniVibe]: anivibe,
  [MediaSource.AnimeUnity]: animeunity,
  [MediaSource.Anilibria]: anilibria,
};

export function getSource(id: MediaSource): Source | undefined {
  return registry[id];
}

export function isSourceImplemented(id: MediaSource): boolean {
  return !!registry[id];
}

export function implementedSources(): MediaSource[] {
  return Object.keys(registry) as MediaSource[];
}
