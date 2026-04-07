import { useEffect, useState } from 'react';

import { getCurrentUser, onAuthStateChange } from '@/services/authService';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (isMounted) {
          setUser(currentUser || null);
        }
      } catch (error) {
        if (isMounted) {
          setAuthError(error.message || 'Failed to read auth state.');
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChange((nextUser) => {
        if (isMounted) {
          setUser(nextUser);
        }
      });
    } catch (error) {
      if (isMounted) {
        setAuthError(error.message || 'Auth listener setup failed.');
        setAuthLoading(false);
      }
    }

    bootstrapAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return {
    user,
    authLoading,
    authError
  };
}
