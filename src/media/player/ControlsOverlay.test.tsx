import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ControlsOverlay from './ControlsOverlay';

function setup(overrides: Record<string, unknown> = {}) {
  const cb = {
    onClose: vi.fn(),
    onTogglePlay: vi.fn(),
    onSeek: vi.fn(),
    onSkip: vi.fn(),
    onRate: vi.fn(),
    onSelectLevel: vi.fn(),
    onSelectSub: vi.fn(),
    onPip: vi.fn(),
    onAirplay: vi.fn(),
    onCast: vi.fn(),
    onFullscreen: vi.fn(),
    onInteract: vi.fn(),
    onAudio: vi.fn(),
  };
  render(
    <ControlsOverlay
      visible
      title="Test Anime"
      episodeLabel="Episode 3"
      playing={false}
      currentTime={30}
      duration={120}
      buffered={60}
      rate={1}
      holdActive={false}
      levels={[{ label: '1080p' }, { label: '720p' }]}
      currentLevel={-1}
      subtitleTracks={[]}
      selectedSub={-1}
      audio="sub"
      pipSupported
      airplaySupported={false}
      castSupported={false}
      {...cb}
      {...overrides}
    />
  );
  return cb;
}

describe('ControlsOverlay', () => {
  it('renders the title, episode label and time', () => {
    setup();
    expect(screen.getByText('Test Anime')).toBeTruthy();
    expect(screen.getByText('Episode 3')).toBeTruthy();
    expect(screen.getByText('0:30')).toBeTruthy(); // current time
    expect(screen.getByText('-1:30')).toBeTruthy(); // remaining
  });

  it('toggles playback', () => {
    const cb = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Play/Pause' }));
    expect(cb.onTogglePlay).toHaveBeenCalled();
  });

  it('skips ±10s', () => {
    const cb = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Back 10s' }));
    fireEvent.click(screen.getByRole('button', { name: 'Forward 10s' }));
    expect(cb.onSkip).toHaveBeenCalledWith(-10);
    expect(cb.onSkip).toHaveBeenCalledWith(10);
  });

  it('seeks via the scrub bar', () => {
    const cb = setup();
    fireEvent.change(screen.getByRole('slider'), { target: { value: '45' } });
    expect(cb.onSeek).toHaveBeenCalledWith(45);
  });

  it('shows the hold-to-speed pill when active', () => {
    setup({ holdActive: true, rate: 2 });
    expect(screen.getByText(/2\.00x/)).toBeTruthy();
  });
});
