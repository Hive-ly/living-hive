import React from 'react'
import { cn } from '../utils/cn'

interface HiveShimmerProps {
  className?: string
}

export function HiveShimmer({ className }: HiveShimmerProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center h-96 w-full',
        className
      )}
      role="status"
      aria-label="Loading visualization"
    >
      <div className="relative w-64 h-64">
        {/* Animated hex shimmer effect */}
        <svg
          className="w-full h-full animate-pulse"
          viewBox="0 0 200 200"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Central hex */}
          <polygon
            points="100,20 180,60 180,140 100,180 20,140 20,60"
            fill="currentColor"
            className="text-gray-300 opacity-30"
          />
          {/* Surrounding hexes */}
          {[0, 1, 2, 3, 4, 5].map(i => {
            const angle = (Math.PI / 3) * i
            const x = 100 + Math.cos(angle) * 80
            const y = 100 + Math.sin(angle) * 80
            return (
              <polygon
                key={i}
                points={`${x},${y - 20} ${x + 40},${y} ${x + 40},${y + 40} ${x},${y + 60} ${x - 40},${y + 40} ${x - 40},${y}`}
                fill="currentColor"
                className="text-gray-300 opacity-20"
                style={{
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-sm text-gray-500">Computing positions...</div>
        </div>
      </div>
    </div>
  )
}

