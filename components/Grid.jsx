"use client"
import React from 'react'
import GridTile from './GridTile'

export default function Grid({ images = [], columns = 4, latestImage = null }) {
  const count = images.length
  const cols = columns

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          width: '100%',
          height: '100%',
          maxHeight: '100%'
        }}
      >
        {images.map((src, i) => (
          <GridTile 
            key={`${src}-${i}`} 
            src={src} 
            index={i}
            isLatest={src === latestImage}
          />
        ))}
      </div>
    </div>
  )
}
