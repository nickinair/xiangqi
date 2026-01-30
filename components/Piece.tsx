import React from 'react';
import { Piece as PieceModel, PlayerColor } from '../types';
import { CHINESE_LABELS } from '../constants';

interface PieceProps {
  piece: PieceModel;
  onClick: () => void;
  isSelected: boolean;
  lastMoveSource?: boolean;
  lastMoveTarget?: boolean;
  isFlipped?: boolean;
}

export const Piece: React.FC<PieceProps> = ({ piece, onClick, isSelected, lastMoveSource, lastMoveTarget, isFlipped = false }) => {
  const label = CHINESE_LABELS[`${piece.color}_${piece.type}`];

  const isRed = piece.color === PlayerColor.RED;

  const visualX = isFlipped ? 8 - piece.position.x : piece.position.x;
  const visualY = isFlipped ? 9 - piece.position.y : piece.position.y;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute w-[10%] h-[9%] flex items-center justify-center transition-all duration-300 z-10 cursor-pointer
        ${isSelected ? 'scale-110 -translate-y-2' : 'hover:scale-105'}
      `}
      style={{
        left: `${((50 + visualX * 100) / 900) * 100}%`, // Precise grid alignment based on SVG coordinates
        top: `${((50 + visualY * 100) / 1000) * 100}%`, // Precise grid alignment based on SVG coordinates
        transform: 'translate(-50%, -50%)', // Center on the intersection
      }}
    >
      <div
        className={`
          relative w-[90%] aspect-square rounded-full flex items-center justify-center select-none
          bg-gradient-to-br from-[#f3dcb2] to-[#dcb376]
          shadow-piece
          border-2 ${isRed ? 'border-red-900/30' : 'border-green-900/30'}
          ${isSelected ? 'shadow-piece-selected ring-2 ring-yellow-400' : ''}
          ${lastMoveTarget || lastMoveSource ? 'ring-2 ring-blue-400/50' : ''}
        `}
      >
        {/* Inner Ring for "Wood" look */}
        <div className="absolute inset-1 rounded-full border border-black/10"></div>

        {/* Character */}
        <span
          className={`
            font-calligraphy text-2xl md:text-3xl lg:text-4xl font-bold 
            ${isRed ? 'text-red-700' : 'text-emerald-800'}
            drop-shadow-sm
          `}
          style={{ textShadow: '0px 1px 0px rgba(255,255,255,0.4)' }}
        >
          {label}
        </span>
      </div>
    </div>
  );
};
