'use client'

import { createContext, useContext, useState } from 'react'
import { cn } from '@/lib/utils'

const TabsContext = createContext<{ active: string; setActive: (v: string) => void }>({
  active: '',
  setActive: () => {},
})

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string
  value?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}) {
  const [internal, setInternal] = useState(defaultValue ?? '')
  const active = value ?? internal
  const setActive = (v: string) => {
    setInternal(v)
    onValueChange?.(v)
  }
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)}
      {...props}
    />
  )
}

export function TabsTrigger({ value, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { active, setActive } = useContext(TabsContext)
  return (
    <button
      type="button"
      onClick={() => setActive(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active === value
          ? 'bg-background text-foreground shadow-sm'
          : 'hover:bg-background/50 hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function TabsContent({ value, className, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return <div className={cn('mt-4', className)} {...props} />
}
