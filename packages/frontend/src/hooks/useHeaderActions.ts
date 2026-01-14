import { useEffect } from 'react';
import { useHeader, type HeaderAction } from '../contexts/HeaderContext';

/**
 * Registers header actions that automatically clean up on unmount.
 * Dependencies should include any values used in action callbacks.
 */
export function useHeaderActions(actions: HeaderAction[], deps: unknown[]): void {
  const { setActions } = useHeader();

  useEffect(() => {
    setActions(actions);
    return () => setActions([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActions, ...deps]);
}
