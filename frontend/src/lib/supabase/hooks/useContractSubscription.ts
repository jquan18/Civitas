'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../client'
import type { Database } from '../types'

type RentalContract = Database['public']['Tables']['rental_contracts']['Row']

export function useContractSubscription(userAddress: string | undefined) {
  const [contracts, setContracts] = useState<RentalContract[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!userAddress) return

    // Initial fetch
    const fetchContracts = async () => {
      const { data } = await supabase
        .from('rental_contracts')
        .select('*')
        .or(`landlord_address.eq.${userAddress},tenant_address.eq.${userAddress}`)
        .order('created_at', { ascending: false })

      if (data) setContracts(data)
    }

    fetchContracts()

    // Subscribe to changes
    const channel = supabase
      .channel('rental_contracts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rental_contracts',
          filter: `landlord_address=eq.${userAddress}`,
        },
        (payload) => {
          console.log('Contract change detected:', payload)

          if (payload.eventType === 'INSERT') {
            setContracts((prev) => [payload.new as RentalContract, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            setContracts((prev) =>
              prev.map((c) =>
                c.contract_address === (payload.new as RentalContract).contract_address
                  ? (payload.new as RentalContract)
                  : c
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setContracts((prev) =>
              prev.filter((c) => c.contract_address !== (payload.old as RentalContract).contract_address)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userAddress, supabase])

  return { contracts }
}
