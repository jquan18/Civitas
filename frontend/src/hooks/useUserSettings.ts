'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface UserSettings {
  network_mode: 'mainnet' | 'testnet';
  currency_display: 'USD' | 'EUR' | 'GBP';
  date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'ISO';
  address_display: 'full' | 'truncated';
  rpc_base_url?: string | null;
  rpc_ethereum_url?: string | null;
  notification_preferences?: Record<string, any>;
}

export function useUserSettings(userAddress: `0x${string}` | undefined) {
  const queryClient = useQueryClient();

  // Fetch user settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['userSettings', userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      const response = await fetch(`/api/settings?user_address=${userAddress}`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json() as Promise<UserSettings>;
    },
    enabled: !!userAddress,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!userAddress) throw new Error('No user address');

      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_address: userAddress,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update settings');
      }

      return response.json();
    },
    onMutate: async (newSettings) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['userSettings', userAddress] });
      const previous = queryClient.getQueryData(['userSettings', userAddress]);

      queryClient.setQueryData(['userSettings', userAddress], (old: UserSettings | undefined) => ({
        ...old,
        ...newSettings,
      } as UserSettings));

      return { previous };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['userSettings', userAddress], context.previous);
      }
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['userSettings', userAddress] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}
