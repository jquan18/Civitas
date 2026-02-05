'use client'

import { useEffect, useState } from 'react'
import { createClient } from '../client'
import type { Transaction } from '@/components/transactions/types'

export function useTransactionSubscription(userAddress: string | undefined) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!userAddress) {
      setLoading(false)
      return
    }

    // Initial fetch
    const fetchTransactions = async () => {
      try {
        const response = await fetch(`/api/transactions?user_address=${userAddress}`)
        if (response.ok) {
          const data = await response.json()
          setTransactions(data.transactions || [])
        }
      } catch (error) {
        console.error('Error fetching transactions:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()

    // Subscribe to ALL contract_transactions changes (not filtered by user)
    // This allows us to see when anyone interacts with contracts
    const channel = supabase
      .channel('contract_transactions_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contract_transactions',
        },
        (payload) => {
          console.log('Transaction change detected:', payload)

          // Refetch to get updated data with proper filtering
          // This ensures we only show relevant transactions
          fetchTransactions()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userAddress, supabase])

  return { transactions, loading }
}
