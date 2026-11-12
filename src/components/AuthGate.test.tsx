import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { AuthGate } from './AuthGate';

// Replace Google's real button with two plain buttons that trigger its callbacks.
vi.mock('@react-oauth/google', async () => {
  const React = await import('react');
  return {
    googleLogout: vi.fn(),
    GoogleLogin: (props: { onSuccess: (r: { credential: string }) => void; onError?: () => void }) =>
      React.createElement(
        'div',
        null,
        React.createElement('button', { onClick: () => props.onSuccess({ credential: 'fake' }) }, 'mock google success'),
        React.createElement('button', { onClick: () => props.onError?.() }, 'mock google failure'),
      ),
  };
});

function renderGate() {
  return render(
    <AuthProvider>
      <AuthGate>
        <p>secret data</p>
      </AuthGate>
    </AuthProvider>,
  );
}

describe('AuthGate', () => {
  it('shows the sign-in screen and hides the children before sign-in', () => {
    renderGate();

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('secret data')).not.toBeInTheDocument();
  });

  it('shows the children after a successful Google sign-in', async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole('button', { name: 'mock google success' }));

    expect(screen.getByText('secret data')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('shows an error and keeps the children hidden when Google sign-in fails', async () => {
    const user = userEvent.setup();
    renderGate();

    await user.click(screen.getByRole('button', { name: 'mock google failure' }));

    expect(screen.getByText('Google sign-in failed. Please try again.')).toBeInTheDocument();
    expect(screen.queryByText('secret data')).not.toBeInTheDocument();
  });
});
