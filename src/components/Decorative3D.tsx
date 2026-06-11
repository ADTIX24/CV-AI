/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

interface Props {
  lang: 'ar' | 'en';
}

export function Decorative3D({ lang }: Props) {
  const [rotate, setRotate] = useState({ x: 12, y: -24 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Map bounds to tilt range
    setRotate({
      x: -y * 0.15,
      y: x * 0.15
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 12, y: -24 });
  };

  return (
    <div 
      className="relative w-full max-w-sm h-[380px] flex items-center justify-center cursor-grab active:cursor-grabbing select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '1000px' }}
      id="3d-interactive-container"
    >
      {/* Outer Glow Effect */}
      <div className="absolute w-72 h-72 bg-gradient-to-tr from-violet-600/30 to-blue-500/30 rounded-full blur-3xl animate-pulse" />

      {/* Floating 3D Card / Device */}
      <div
        className="relative w-64 h-84 rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 shadow-2xl transition-transform duration-300 ease-out flex flex-col justify-between overflow-hidden"
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
          transformStyle: 'preserve-3d',
          boxShadow: '0 25px 50px -12px rgba(139, 92, 246, 0.25)'
        }}
      >
        {/* Holographic matrix grids */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,58,237,0.15),transparent_70%)] pointer-events-none" />
        <div className="absolute -inset-y-12 inset-x-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none opacity-30" />

        {/* Header decoration */}
        <div className="flex items-center justify-between" style={{ transform: 'translateZ(30px)' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-[10px] font-mono text-violet-400 tracking-wider">SECURE AI MODEL</span>
        </div>

        {/* Floating Mockup Resume Badge */}
        <div 
          className="my-auto space-y-4 text-left font-sans"
          style={{ transform: 'translateZ(50px)' }}
        >
          {/* Virtual Portrait representation */}
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full border border-violet-500/40 bg-zinc-900 p-0.5 overflow-hidden flex items-center justify-center shadow-lg">
              {/* Virtual AI laser face scan indicator */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-cyan-400 animate-bounce shadow-[0_0_8px_cyan]" />
              <svg className="w-8 h-8 text-violet-400/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <div className="w-24 h-3.5 bg-gradient-to-r from-violet-400 to-fuchsia-400 rounded-md" />
              <div className="w-16 h-2 bg-zinc-800 rounded mt-1.5" />
            </div>
          </div>

          {/* Lines simulating professional blocks */}
          <div className="space-y-2 pt-2 border-t border-zinc-900">
            <div className="flex justify-between items-center text-[10px] text-zinc-500 font-mono">
              <span>EXPERIENCE</span>
              <span className="text-emerald-400">ATS OK</span>
            </div>
            <div className="w-full h-2.5 bg-zinc-900/90 rounded-md overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 w-3/4 bg-violet-500" />
            </div>
            <div className="w-4/5 h-2.5 bg-zinc-900/90 rounded-md overflow-hidden relative">
              <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-violet-600" />
            </div>
          </div>

          {/* Dynamic Floating Badges */}
          <div className="flex gap-1.5 flex-wrap pt-1">
            <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-blue-500/10 border border-blue-500/20 text-blue-300">Gemini-3.5</span>
            <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-violet-500/10 border border-violet-500/20 text-violet-300">Resume v2.4</span>
            <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300">Formal AI</span>
          </div>
        </div>

        {/* Footer decoration */}
        <div 
          className="flex justify-between items-center text-[10px] text-zinc-500 font-mono pt-3 border-t border-zinc-900"
          style={{ transform: 'translateZ(20px)' }}
        >
          <span>CV AI COMPILER</span>
          <span className="text-violet-400 animate-pulse">● READY</span>
        </div>
      </div>
    </div>
  );
}
export default Decorative3D;
