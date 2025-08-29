// Create a stable auth hook that doesn't re-render components
import { useRef, useCallback } from 'react';
import { useAuth } from '@clerk/clerk-react';

export const useStableAuth = () => {
  const auth = useAuth();
  const authRef = useRef(auth);
  
  // Update the ref without causing re-renders
  authRef.current = auth;
  
  // Return a stable getToken function that always uses the latest auth
  const getToken = useCallback(async (): Promise<string | null> => {
    return await authRef.current.getToken();
  }, []); // Empty deps = stable reference
  
  return { getToken };
};