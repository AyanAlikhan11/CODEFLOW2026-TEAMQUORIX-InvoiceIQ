'use client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-10 w-10 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="glass-card lg:col-span-2">
          <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-72 w-full rounded-lg" />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="pt-4">
            <Skeleton className="h-52 w-full rounded-lg" />
          </CardContent>
        </Card>
      </div>
      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="glass-card">
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export function InvoiceListSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-64" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i} className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-6 w-20" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function UploadSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="glass-card rounded-2xl p-12 text-center">
        <Skeleton className="h-20 w-20 rounded-2xl mx-auto mb-6" />
        <Skeleton className="h-6 w-64 mx-auto mb-3" />
        <Skeleton className="h-4 w-96 mx-auto mb-6" />
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-16 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card className="glass-card">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-4">
        <Skeleton className="w-full rounded-lg" style={{ height: `${height}px` }} />
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-secondary/50">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-5 w-16" />
        </div>
      ))}
    </div>
  )
}
