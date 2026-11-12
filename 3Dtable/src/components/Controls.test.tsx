import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Controls } from './Controls';

describe('Controls', () => {
  it('renders one button per layout, in order', () => {
    render(<Controls active="table" onChange={vi.fn()} />);

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'TABLE',
      'SPHERE',
      'HELIX',
      'GRID',
    ]);
  });

  it('marks only the active layout', () => {
    render(<Controls active="helix" onChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'HELIX' })).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'TABLE' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'SPHERE' })).not.toHaveClass('active');
    expect(screen.getByRole('button', { name: 'GRID' })).not.toHaveClass('active');
  });

  it('calls onChange with the clicked layout id', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controls active="table" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'SPHERE' }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('sphere');
  });
});
