"use client"
import React from 'react'

export default function Counter({ total = 0 }) {
  return (
    <div className="text-center">
      <div className="text-white text-opacity-70 font-light text-lg">
        {Intl.NumberFormat().format(total)} smiles
      </div>
    </div>
  )
}
