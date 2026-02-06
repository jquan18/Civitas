'use client'

import { useState, useEffect, useMemo } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import type { TemplateDefinition } from '@/lib/templates/types'
import { formatUnits } from 'viem'
import { getContractSource } from '@/lib/contracts/source-code'
import { highlightSolidity } from '@/lib/utils/syntax-highlight'

interface ContractReceiptCardProps {
  template: TemplateDefinition
  config: any
  onDeploy?: () => void
  onBasenameChange?: (basename: string | null) => void
  isDeploying?: boolean
  isSuccess?: boolean
  deployedAddress?: string
}

export function ContractReceiptCard({
  template,
  config,
  onDeploy,
  onBasenameChange,
  isDeploying = false,
  isSuccess = false,
  deployedAddress,
}: ContractReceiptCardProps) {
  const [completeness, setCompleteness] = useState(0)
  const [isPressed, setIsPressed] = useState(false)
  const [isFlipped, setIsFlipped] = useState(false)
  const [customizeBasename, setCustomizeBasename] = useState(false)
  const [customBasename, setCustomBasename] = useState('')
  const [basenameError, setBasenameError] = useState<string | null>(null)

  // Generate stable random barcode heights
  const barcodeHeights = useMemo(() =>
    Array.from({ length: 40 }, () => Math.random() * 60 + 40),
    [])

  const contractSource = getContractSource(template.id)

  // Calculate form completeness
  useEffect(() => {
    if (!config) {
      setCompleteness(0)
      return
    }

    const requiredFields = Object.keys(template.parameterSchema?.shape || {})
    const filledFields = requiredFields.filter((key) => {
      const value = config[key]
      if (Array.isArray(value)) {
        return value.length > 0
      }
      return value !== undefined && value !== null && value !== ''
    })
    const percentage = requiredFields.length > 0
      ? (filledFields.length / requiredFields.length) * 100
      : 0
    setCompleteness(percentage)
  }, [config, template])

  // Notify parent of basename changes
  useEffect(() => {
    if (onBasenameChange) {
      if (customizeBasename && customBasename) {
        // Simple regex for immediate feedback (more rigorous check on deploy)
        const isValid = /^[a-z0-9]([a-z0-9-]{1,28}[a-z0-9])?$/.test(customBasename)
        if (!isValid) {
          setBasenameError('Use lowercase letters, numbers, and hyphens (3-30 chars).')
          onBasenameChange(null) // Don't pass invalid names
        } else {
          setBasenameError(null)
          onBasenameChange(customBasename)
        }
      } else {
        setBasenameError(null)
        onBasenameChange(null)
      }
    }
  }, [customizeBasename, customBasename, onBasenameChange])

  const formatValue = (field: any, value: any) => {
    if (!value && value !== 0) return '---'

    switch (field.type) {
      case 'address':
        if (typeof value === 'string' && value.startsWith('0x')) {
          return `${value.slice(0, 6)}...${value.slice(-4)}`
        }
        return value
      case 'addressList':
        // Return array for special rendering below
        return Array.isArray(value) ? value : []
      case 'bpsList':
        // Return array for special rendering below
        return Array.isArray(value) ? value : []
      case 'duration':
        try {
          const seconds = typeof value === 'string' ? parseInt(value) : value
          if (seconds >= 86400) return `${Math.floor(seconds / 86400)} days`
          if (seconds >= 3600) return `${Math.floor(seconds / 3600)} hours`
          return `${seconds} seconds`
        } catch {
          return value
        }
      case 'amount':
        try {
          const numValue = typeof value === 'string' ? value : value.toString()
          // Assume USDC with 6 decimals if value looks like wei
          const formatted = numValue.length > 8
            ? formatUnits(BigInt(numValue), 6)
            : numValue
          return (
            parseFloat(formatted).toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) + ' USDC'
          )
        } catch {
          return value
        }
      case 'date':
        try {
          let date: Date
          // Handle ISO 8601 string (from AI)
          if (typeof value === 'string' && value.includes('T')) {
            date = new Date(value)
          } else {
            const timestamp = typeof value === 'string' ? parseInt(value) : value
            date = timestamp > 10000000000 ? new Date(timestamp) : new Date(timestamp * 1000)
          }
          // Format as "Feb 2, 2026"
          return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })
        } catch {
          return value
        }
      case 'state':
        return field.format ? field.format(value) : value
      case 'number':
        return value.toString()
      case 'boolean':
        return value ? 'Yes' : 'No'
      case 'array':
        return Array.isArray(value) ? `${value.length} items` : value
      default:
        if (field.format) {
          return field.format(value)
        }
        return String(value)
    }
  }

  const isComplete = completeness === 100

  // Helper function to shorten address (first 4 + last 4)
  const shortenAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`  // 0x + 4 chars ... last 4
  }

  // Get fields to display (prefer receiptFields over dashboardFields)
  const fieldsToDisplay = template.receiptFields || template.dashboardFields

  return (
    <div className="relative mb-8 w-full max-w-md mx-auto">
      {/* Toggle Button */}
      <button
        onClick={() => setIsFlipped(!isFlipped)}
        className={`
          w-full mb-4 py-4 font-black text-lg uppercase tracking-tight
          border-[3px] border-black transition-all duration-75
          ${isFlipped
            ? 'bg-white shadow-none translate-x-[4px] translate-y-[4px]'
            : 'bg-[#FFD600] shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]'
          }
        `}
      >
        {isFlipped ? '/// SHOW RECEIPT ///' : '/// SHOW CODE ///'}
      </button>

      {/* Flip Container */}
      <div className="flip-container">
        <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>

          {/* FRONT SIDE - Receipt */}
          <div className="flip-card-face">
            {/* Receipt Card with Torn Paper Effect */}
            <div className="torn-paper animate-receipt-print w-full">
              <div className="torn-paper-inner">
                {/* Header */}
                <div className="p-6 border-b-2 border-dashed border-black">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-2xl uppercase tracking-tight text-black">
                      RECEIPT
                    </h3>
                    <div className="bg-black px-3 py-1 font-mono text-xs">
                      <span style={{ color: '#FFFFFF' }} className="font-bold">
                        {new Date().toISOString().split('T')[0]}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-black">
                    TEMPLATE: {template.name.toUpperCase()}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="px-6 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs uppercase font-bold text-black">
                      COMPLETION
                    </span>
                    <span className="font-mono text-xs font-bold text-black">
                      {completeness.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#FAF9F6] border border-black">
                    <div
                      className="h-full bg-[#CCFF00] transition-all duration-300"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                </div>

                {/* Parameters */}
                <div className="p-6 space-y-4">
                  {fieldsToDisplay.map((field, index) => {
                    const value = config?.[field.key]
                    const hasValue =
                      value !== undefined && value !== null && value !== ''

                    // Skip shareBps as separate row (rendered inline with addressList)
                    if (field.key === 'shareBps') {
                      return null
                    }

                    const formattedValue = formatValue(field, value)

                    return (
                      <div key={field.key}>
                        {/* Field Row */}
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2 flex-1">
                            {hasValue ? (
                              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 flex-shrink-0 opacity-30 text-gray-400" />
                            )}
                            <span className="font-mono text-xs uppercase font-bold text-black bg-white">
                              {field.label}
                            </span>
                          </div>
                          {field.type !== 'addressList' && (
                            <span
                              className={`font-mono text-sm text-right bg-white ${hasValue ? 'font-bold text-black' : 'opacity-30 text-gray-400'
                                }`}
                            >
                              {formattedValue}
                            </span>
                          )}
                        </div>

                        {/* Special rendering for addressList with share percentages */}
                        {field.type === 'addressList' && Array.isArray(formattedValue) && formattedValue.length > 0 && (
                          <div className="mt-2 space-y-1 pl-6">
                            {formattedValue.map((addr: string, i: number) => {
                              const shareBps = config?.shareBps?.[i]
                              const sharePercent = shareBps ? (shareBps / 100).toFixed(1) : '?'
                              return (
                                <div key={i} className="flex justify-between text-xs font-mono text-black">
                                  <span>{i + 1}. {shortenAddress(addr)}</span>
                                  <span className="font-bold">{sharePercent}%</span>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Dashed divider */}
                        {index < fieldsToDisplay.length - 1 && (
                          <div className="border-b border-dashed border-black mt-4" />
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Barcode (Stable) */}
                <div className="p-6 flex justify-center flex-col items-center">
                  <div className="flex gap-[2px] h-12 mb-6">
                    {barcodeHeights.map((height, i) => (
                      <div
                        key={i}
                        className="w-[3px] bg-black"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>

                  {/* Basename Customization Section */}
                  {!isSuccess && (
                    <div className="w-full border-t-[2px] border-dashed border-black pt-6">
                      <button
                        onClick={() => setCustomizeBasename(!customizeBasename)}
                        className="group flex items-center gap-3 text-xs font-mono font-bold uppercase hover:text-cyan-600 transition-colors mb-4 w-full"
                      >
                        <div className={`
                          w-5 h-5 border-[2px] border-black flex items-center justify-center transition-all duration-200
                          ${customizeBasename ? 'bg-cyan-400 shadow-[2px_2px_0px_#000]' : 'bg-white group-hover:shadow-[2px_2px_0px_#000]'}
                        `}>
                          {customizeBasename && <CheckCircle2 className="w-3 h-3 text-black" />}
                        </div>
                        <span className="tracking-wider">Assign Custom Identity</span>
                      </button>

                      {customizeBasename && (
                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                          <div className={`
                            relative bg-white border-[2px] border-black p-1 transition-all duration-200
                            ${basenameError ? 'shadow-[4px_4px_0px_#EF4444]' : 'shadow-[4px_4px_0px_#000] focus-within:shadow-[2px_2px_0px_#000] focus-within:translate-x-[2px] focus-within:translate-y-[2px]'}
                          `}>
                            {/* "Rivets" */}
                            <div className="absolute top-1 left-1 w-1 h-1 bg-black rounded-full opacity-20" />
                            <div className="absolute top-1 right-1 w-1 h-1 bg-black rounded-full opacity-20" />
                            <div className="absolute bottom-1 left-1 w-1 h-1 bg-black rounded-full opacity-20" />
                            <div className="absolute bottom-1 right-1 w-1 h-1 bg-black rounded-full opacity-20" />

                            <div className="px-3 py-2">
                              <label className="block text-[10px] font-mono font-bold uppercase text-gray-400 mb-1 tracking-widest">
                                Basename ID
                              </label>
                              <div className="flex items-center">
                                <input
                                  type="text"
                                  value={customBasename}
                                  onChange={(e) => {
                                    setCustomBasename(e.target.value.toLowerCase())
                                  }}
                                  placeholder="your-name"
                                  className="w-full font-headline text-lg uppercase bg-transparent outline-none placeholder:text-gray-200 text-black"
                                />
                                <div className="font-headline text-lg text-black/30 pointer-events-none select-none">
                                  .civitas...
                                </div>
                              </div>
                            </div>
                          </div>

                          {basenameError ? (
                            <div className="flex items-center gap-2 text-xs text-red-600 font-mono font-bold bg-red-50 border border-red-200 p-2">
                              <AlertCircle className="w-4 h-4 flex-shrink-0" />
                              <span>{basenameError}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono pl-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                              <span>Ready for verification</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BACK SIDE - Code */}
          <div className="flip-card-face flip-card-back h-full">
            <div
              className="torn-paper w-full h-full flex flex-col"
              style={{ filter: 'drop-shadow(-6px 6px 0px #000)' }}
            >
              <div className="torn-paper-inner bg-slate-50 flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="p-6 border-b-2 border-dashed border-black">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-black text-xl uppercase tracking-tight text-black">
                      SOURCE CODE
                    </h3>
                    <div className="bg-black px-2 py-1 font-mono text-[10px]">
                      <span style={{ color: '#FFFFFF' }} className="font-bold">
                        {template.name.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-black">
                    CONTRACT: {template.contractName || 'UNKNOWN'}
                  </div>
                </div>

                {/* Code Block */}
                <div className="p-4 flex-1 overflow-y-auto overflow-x-auto min-h-0">
                  <div className="bg-white border border-gray-200 p-2 text-[10px] shadow-inner min-h-full whitespace-pre">
                    {highlightSolidity(contractSource)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deploy Button or Success Indicator */}
      {isSuccess && deployedAddress ? (
        <a
          href={`/dashboard`}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          className={`
            block w-full mt-6 py-6 font-black text-2xl uppercase tracking-tight
            border-[3px] border-black transition-all duration-75
            ${isPressed
              ? 'bg-white translate-x-[4px] translate-y-[4px] shadow-none cursor-pointer'
              : 'bg-[#CCFF00] shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] cursor-pointer'
            }
          `}
        >
          <div className="flex items-center justify-center gap-3">
            <CheckCircle2 className="w-8 h-8" />
            <span>/// VIEW CONTRACT ///</span>
          </div>
        </a>
      ) : (
        <button
          disabled={!isComplete || isDeploying}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
          onClick={onDeploy}
          className={`
            w-full mt-6 py-6 font-black text-2xl uppercase tracking-tight
            border-[3px] border-black transition-all duration-75
            ${isComplete && !isDeploying
              ? isPressed
                ? 'bg-white translate-x-[4px] translate-y-[4px] shadow-none cursor-pointer'
                : 'bg-[#FF00FF] shadow-[4px_4px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000] cursor-pointer'
              : 'bg-[#FAF9F6] text-gray-400 cursor-not-allowed shadow-none'
            }
          `}
        >
          {isDeploying
            ? '/// DEPLOYING ///'
            : isComplete
              ? '/// CONFIRM DEPLOY ///'
              : '/// INCOMPLETE ///'}
        </button>
      )}

      {/* Status Message */}
      {!isComplete && !isDeploying && !isSuccess && (
        <div className="mt-4 bg-[#FFD600] border-[3px] border-black p-4">
          <p className="font-mono text-sm font-bold text-black">
            [WAITING] Fill all parameters to proceed
          </p>
        </div>
      )}

      {/* Success Details */}
      {isSuccess && deployedAddress && (
        <div className="mt-4 bg-[#CCFF00] border-[3px] border-black p-4 shadow-[4px_4px_0px_#000]">
          <div className="space-y-2">
            <p className="font-mono text-sm font-bold text-black flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              [DEPLOYED] Contract successfully created!
            </p>
            <p className="font-mono text-xs break-all text-black">
              Address: {deployedAddress}
            </p>
          </div>
        </div>
      )}

      {/* Receipt Print Animation */}
    </div>
  )
}
