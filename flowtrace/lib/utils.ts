import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateConsistent(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString()
  }
}

export function isValidAddress(address: string): boolean {
  // Basic validation for common address formats
  const bitcoinRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$|^bc1[a-z0-9]{39,59}$/
  const ethereumRegex = /^0x[a-fA-F0-9]{40}$/
  
  return bitcoinRegex.test(address) || ethereumRegex.test(address)
}

export function truncateAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2) return address
  return `${address.slice(0, length)}...${address.slice(-length)}`
}

// Utility functions for connection debugging and state management
export const generateUniqueTxHash = (): string => {
  return `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime()) as T
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as T
  if (typeof obj === 'object') {
    const clonedObj = {} as T
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key])
      }
    }
    return clonedObj
  }
  return obj
}

export const createConnectionHash = (connections: any[]): string => {
  return JSON.stringify(connections.map(conn => ({
    from: conn.from,
    to: conn.to,
    txHash: conn.txHash,
    amount: conn.amount,
    note: conn.note,
    currency: conn.currency,
    date: conn.date,
    direction: conn.direction,
    hideTxId: conn.hideTxId
  })).sort((a, b) => (a.txHash || '').localeCompare(b.txHash || '')))
}

export const validateConnection = (connection: any): boolean => {
  return !!(
    connection.from &&
    connection.to &&
    connection.from !== connection.to &&
    connection.txHash
  )
}
