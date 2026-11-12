import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { googleLogout } from '@react-oauth/google';
import { useAuth } from './AuthContext';
import { AuthProvider } from './AuthProvider';

vi.mock('@react-oauth/google', () => ({ googleLogout: vi.fn() }));

beforeEach(() => {
  vi.mocked(googleLogout).mockClear();
});

describe('AuthProvider / useAuth', () => {
  it('starts signed out with no error', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.signedIn).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('signIn marks the user as signed in', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.signIn());

    expect(result.current.signedIn).toBe(true);
  });

  it('fail sets an error message and stays signed out', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.fail());

    expect(result.current.error).toBe('Google sign-in failed. Please try again.');
    expect(result.current.signedIn).toBe(false);
  });

  it('a later successful sign-in clears the error', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.fail());
    act(() => result.current.signIn());

    expect(result.current.error).toBeNull();
    expect(result.current.signedIn).toBe(true);
  });

  it('signOut signs out of Google and resets the state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.signIn());
    act(() => result.current.signOut());

    expect(googleLogout).toHaveBeenCalledTimes(1);
    expect(result.current.signedIn).toBe(false);
  });

  it('useAuth throws when used outside the provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>');

    consoleError.mockRestore();
  });
});
