import { describe, it, expect } from 'vitest';
import { parseGogoSearch, parseGogoEpisodeCount } from './gogoanime';
import {
  parseAnimeflvSearch,
  parseAnimeflvEpisodeCount,
  parseAnimeflvEmbeds,
} from './animeflv';
import { parseAnimeSamaSearch, parseAnimeSamaEpisodes } from './animesama';
import { parseAnimeNanaSearch, parseAnimeNanaEpisodes } from './animenana';
import { firstSrcset, decodeEntityJson, titleFromHref } from './htmlSource';
import { pickAnilibriaHls } from './anilibria';
import {
  parseSibnetFile,
  parseVidmolyFile,
  parseSendvidFile,
  parseVoe,
  parseVidoza,
  parseStreamtape,
  unpackPacked,
  findDirectStream,
} from '../extractors';

describe('GoGoAnime parsing', () => {
  it('parses search results', () => {
    const html = `<ul class="items">
      <li><a href="/category/naruto" title="Naruto"><img src="https://img/naruto.jpg" alt="Naruto" /></a>
      <p class="name"><a>Naruto</a></p></li>
    </ul>`;
    const r = parseGogoSearch(html);
    expect(r).toHaveLength(1);
    expect(r[0].title).toBe('Naruto');
    expect(r[0].href).toBe('https://anitaku.bz/category/naruto');
    expect(r[0].coverUrl).toBe('https://img/naruto.jpg');
  });

  it('reads max episode count from the page range', () => {
    const html = `<ul id="episode_page">
      <li><a ep_start="0" ep_end="50"></a></li>
      <li><a ep_start="51" ep_end="100"></a></li>
    </ul>`;
    expect(parseGogoEpisodeCount(html)).toBe(100);
  });
});

describe('AnimeFLV parsing', () => {
  it('parses search results', () => {
    const html = `<ul class="ListAnimes">
      <li><a href="/anime/naruto"><img src="/uploads/naruto.jpg" alt="Naruto"/>
      <h3 class="Title">Naruto</h3></a></li>
    </ul>`;
    const r = parseAnimeflvSearch(html);
    expect(r[0].title).toBe('Naruto');
    expect(r[0].href).toBe('https://www3.animeflv.net/anime/naruto');
    expect(r[0].coverUrl).toBe('https://www3.animeflv.net/uploads/naruto.jpg');
  });

  it('reads episode count from the episodes script', () => {
    expect(parseAnimeflvEpisodeCount('var episodes = [[12,1234],[11,1233]];')).toBe(12);
  });

  it('extracts embed urls from the videos object', () => {
    const html = `var videos = {"SUB":[{"server":"SW","code":"https:\\/\\/embed.host\\/abc","url":"https:\\/\\/embed.host\\/abc"}]};`;
    expect(parseAnimeflvEmbeds(html)).toContain('https://embed.host/abc');
  });
});

describe('AnimeSama parsing', () => {
  it('parses the search fragment', () => {
    const html = `<a href="catalogue/frieren/"><img src="/img/frieren.jpg" alt="Frieren"/><h3>Frieren</h3></a>`;
    const r = parseAnimeSamaSearch(html);
    expect(r[0].title).toBe('Frieren');
    expect(r[0].href).toContain('/catalogue/frieren/');
  });

  it('parses episodes.js host arrays', () => {
    const js = `var eps1 = ['https://video.sibnet.ru/shell.swf?videoid=1', "https://vidmoly.to/embed-a.html"];
      var eps2 = ['https://sendvid.com/x'];`;
    const arrays = parseAnimeSamaEpisodes(js);
    expect(arrays).toHaveLength(2);
    expect(arrays[0]).toHaveLength(2);
    expect(arrays[0][0]).toContain('sibnet');
    const count = arrays.reduce((m, a) => Math.max(m, a.length), 0);
    expect(count).toBe(2);
  });
});

describe('AnimeNana parsing', () => {
  it('parses search results (data-src poster)', () => {
    const html = `<a href="/animeserie/naruto/"><div class="card component-latest"><div class="card-body">
      <div class="animeposter"><img src="/img/placeholder.png" data-src="/cache/images/naruto.jpg" class="lozad"/></div>
      <div class="animeinfo"><h5 class="animename">Naruto</h5><p class="animetitle">ナルト</p></div>
    </div></div></a>`;
    const r = parseAnimeNanaSearch(html);
    expect(r[0].title).toBe('Naruto');
    expect(r[0].href).toBe('https://animenana.com/animeserie/naruto/');
    expect(r[0].coverUrl).toBe('https://animenana.com/cache/images/naruto.jpg');
  });

  it('parses episode links to /view/<id>', () => {
    const html = `<a href="/view/7747513247" title="Naruto Episode 001"><div class="card component-episodes">
      <div class="animeinfo"><h5 class="animename">Episode  001</h5></div></div></a>
      <a href="/view/7747513248" title="Naruto Episode 002"><div class="card component-episodes">
      <div class="animeinfo"><h5 class="animename">Episode  002</h5></div></div></a>`;
    const r = parseAnimeNanaEpisodes(html);
    expect(r).toHaveLength(2);
    expect(r[0].number).toBe(1);
    expect(r[0].href).toBe('https://animenana.com/view/7747513247');
  });
});

describe('htmlSource helpers', () => {
  it('firstSrcset takes the first url', () => {
    expect(firstSrcset('/a.jpg 1x, /b.jpg 2x')).toBe('/a.jpg');
  });
  it('titleFromHref derives a readable title from a slug', () => {
    expect(titleFromHref('https://x/anime/some-cool-anime/')).toBe('some cool anime');
  });
  it('decodeEntityJson parses entity-encoded JSON', () => {
    expect(decodeEntityJson<{ id: number }[]>('[{&quot;id&quot;:1}]')).toEqual([{ id: 1 }]);
  });
});

describe('Anilibria', () => {
  it('prefers 1080 then 720 then 480 (URLs are absolute)', () => {
    expect(pickAnilibriaHls({ hls_720: 'https://x/720.m3u8', hls_480: 'https://x/480.m3u8' })).toBe('https://x/720.m3u8');
    expect(pickAnilibriaHls({ hls_1080: 'https://x/1080.m3u8', hls_720: 'https://x/720.m3u8' })).toBe('https://x/1080.m3u8');
    expect(pickAnilibriaHls(undefined)).toBe('');
  });
});

describe('embed extractors', () => {
  it('parses sibnet file path', () => {
    expect(parseSibnetFile('player.src([{src: "/v/abc/123.mp4"}])')).toBe('/v/abc/123.mp4');
  });
  it('parses vidmoly m3u8', () => {
    expect(parseVidmolyFile('file:"https://x/master.m3u8"')).toBe('https://x/master.m3u8');
  });
  it('parses sendvid source', () => {
    expect(parseSendvidFile('<source src="https://x/v.mp4" type="video/mp4">')).toBe('https://x/v.mp4');
  });
  it('finds a direct hls stream', () => {
    const r = findDirectStream('blah "https://cdn.test/stream/master.m3u8" blah');
    expect(r).toEqual({ url: 'https://cdn.test/stream/master.m3u8', type: 'hls' });
  });

  it('decodes a base64 VOE hls source', () => {
    const real = 'https://cdn.voe/abc/master.m3u8';
    const html = `var sources = {'hls': '${btoa(real)}'};`;
    expect(parseVoe(html)).toBe(real);
  });

  it('parses a Vidoza mp4 source', () => {
    expect(parseVidoza('<source src="https://v.example/file.mp4" type="video/mp4">')).toBe(
      'https://v.example/file.mp4'
    );
  });

  it('unpacks a packed (p,a,c,k,e,d) payload', () => {
    const packed =
      "eval(function(p,a,c,k,e,d){return p}('0 1 2',3,3,'https|file|m3u8'.split('|'),0,{}))";
    const out = unpackPacked(packed);
    expect(out).toContain('https');
    expect(out).toContain('m3u8');
  });

  it('reassembles a Streamtape token', () => {
    const html = `document.getElementById('robotlink').innerHTML = '//streamtape.com/get_video?id=abc&expires=1' + ('&token=xyz&stream=1')`;
    expect(parseStreamtape(html)).toBe(
      'https://streamtape.com/get_video?id=abc&expires=1&token=xyz&stream=1'
    );
  });
});
