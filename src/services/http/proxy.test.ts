import { describe, it, expect } from 'vitest';
import { applyProxy, DEFAULT_PROXY_BASE } from './proxyConfig';

const target = 'https://animenana.com/search/?key=naruto';

describe('applyProxy', () => {
  it('uses the built-in default (param) when enabled with no custom URL', () => {
    const out = applyProxy(target, { proxyEnabled: true, proxyBaseUrl: '', proxyMode: 'param' });
    expect(out).toBe(`${DEFAULT_PROXY_BASE}?url=${encodeURIComponent(target)}`);
  });

  it('returns the target unchanged when disabled', () => {
    expect(applyProxy(target, { proxyEnabled: false, proxyBaseUrl: '', proxyMode: 'param' })).toBe(target);
  });

  it('applies a custom param proxy', () => {
    const out = applyProxy(target, { proxyEnabled: true, proxyBaseUrl: 'https://p.example/get', proxyMode: 'param' });
    expect(out).toBe(`https://p.example/get?url=${encodeURIComponent(target)}`);
  });

  it('applies a custom prefix proxy', () => {
    const out = applyProxy(target, { proxyEnabled: true, proxyBaseUrl: 'https://p.example/', proxyMode: 'prefix' });
    expect(out).toBe(`https://p.example/${target}`);
  });
});
