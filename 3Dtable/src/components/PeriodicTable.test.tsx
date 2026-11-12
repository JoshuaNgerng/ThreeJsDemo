import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeriodicTable } from './PeriodicTable';

// The real hook creates a Three.js scene, which needs a real browser layout.
// Replace it with a stub so we only test the React side.
const { setLayout } = vi.hoisted(() => ({ setLayout: vi.fn() }));

vi.mock('../hooks/usePeriodicScene', () => ({
  usePeriodicScene: () => ({ containerRef: { current: null }, setLayout }),
}));

beforeEach(() => {
  setLayout.mockClear();
});

describe('PeriodicTable', () => {
  it('starts on the table layout', () => {
    render(<PeriodicTable />);

    expect(screen.getByRole('button', { name: 'TABLE' })).toHaveClass('active');
    expect(setLayout).not.toHaveBeenCalled();
  });

  it('tells the scene to change layout and highlights the new button', async () => {
    const user = userEvent.setup();
    render(<PeriodicTable />);

    await user.click(screen.getByRole('button', { name: 'SPHERE' }));

    expect(setLayout).toHaveBeenCalledTimes(1);
    expect(setLayout).toHaveBeenCalledWith('sphere');
    expect(screen.getByRole('button', { name: 'SPHERE' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'TABLE' })).not.toHaveClass('active');
  });

  it('can switch through every layout', async () => {
    const user = userEvent.setup();
    render(<PeriodicTable />);

    for (const [label, id] of [['HELIX', 'helix'], ['GRID', 'grid'], ['TABLE', 'table']] as const) {
      await user.click(screen.getByRole('button', { name: label }));
      expect(setLayout).toHaveBeenLastCalledWith(id);
    }
    expect(setLayout).toHaveBeenCalledTimes(3);
  });

  it('shows the colour legend with 15 steps', () => {
    const { container } = render(<PeriodicTable />);

    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(container.querySelectorAll('.colour-bar-segment')).toHaveLength(15);
  });
});
