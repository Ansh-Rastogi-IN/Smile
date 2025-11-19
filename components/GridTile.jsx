"use client"
import React, { useEffect, useState } from 'react'
import clsx from 'clsx'

export default function GridTile({ src, index = 0, isLatest = false }) {
  const [visibleSrc, setVisibleSrc] = useState(src)
  const [isFading, setIsFading] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    if (src === visibleSrc) return
    
    setIsFading(true)
    setIsNew(true)
    
    const img = new Image()
    img.src = src
    img.onload = () => {
      setVisibleSrc(src)
      const t1 = setTimeout(() => setIsFading(false), 400)
      const t2 = setTimeout(() => setIsNew(false), 1000)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    }
    return () => {}
  }, [src, visibleSrc])

  const isPlaceholder = src.includes('placeholder')

  return (
    <div 
      className={clsx(
        'relative w-full h-full overflow-hidden rounded-lg bg-gradient-to-br from-gray-800 to-gray-900',
        'transition-all duration-300 hover:scale-[1.02] hover:z-10',
        'shadow-md hover:shadow-xl',
        isNew && !isPlaceholder && 'ring-2 ring-yellow-400 animate-pulse-ring',
        isPlaceholder && 'opacity-20'
      )}
      style={{
        animationDelay: `${index * 0.05}s`
      }}
    >
      <img
        src={visibleSrc}
        alt="smile"
        className={clsx(
          'object-cover w-full h-full transition-all duration-500',
          isFading ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        )}  
        draggable={false}
      />
      
      {isNew && !isPlaceholder && (
        <div className="absolute top-1 right-1 bg-yellow-400 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
          NEW
        </div>
      )}
      
      {!isPlaceholder && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
      )}
    </div>
  )
}
