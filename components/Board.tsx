import React, { useMemo } from 'react';
import { GameState, Piece as PieceModel, Position, PlayerColor } from '../types';
import { Piece } from './Piece';

interface BoardProps {
  gameState: GameState;
  onSquareClick: (pos: Position) => void;
  onPieceClick: (piece: PieceModel) => void;
  isMyTurn: boolean;
  isFlipped?: boolean;
}

export const Board: React.FC<BoardProps> = ({ gameState, onSquareClick, onPieceClick, isMyTurn, isFlipped = false }) => {
  const { pieces, selectedPieceId, lastMove } = gameState;

  // Helper to transform position based on flip state
  const getVisualPos = (pos: Position) => {
    if (isFlipped) {
      return { x: 8 - pos.x, y: 9 - pos.y };
    }
    return pos;
  };

  // Generate grid points for click detection
  const gridPoints = useMemo(() => {
    const points = [];
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 9; x++) {
        points.push({ x, y });
      }
    }
    return points;
  }, []);

  return (
    <div className="relative w-full max-w-[600px] aspect-[9/10] bg-[#e4c083] rounded-lg shadow-2xl border-[12px] border-[#ba702e] p-4 mx-auto select-none overflow-hidden wood-texture">

      {/* Board Markings SVG Layer */}
      <svg className="absolute inset-0 w-full h-full p-[inherit] pointer-events-none" viewBox="0 0 900 1000" style={{ transform: isFlipped ? 'rotate(180deg)' : 'none' }}>
        <defs>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            {/* Small pattern if needed, but we draw lines manually for standard Xiangqi */}
          </pattern>
        </defs>

        {/* Main Border */}
        <rect x="50" y="50" width="800" height="900" fill="none" stroke="#643a23" strokeWidth="4" />

        {/* Horizontal Lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <line key={`h-${i}`} x1="50" y1={50 + i * 100} x2="850" y2={50 + i * 100} stroke="#643a23" strokeWidth="2" />
        ))}

        {/* Vertical Lines (Split by River) */}
        {Array.from({ length: 7 }).map((_, i) => (
          <React.Fragment key={`v-${i}`}>
            {/* Top Half */}
            <line x1={150 + i * 100} y1="50" x2={150 + i * 100} y2="450" stroke="#643a23" strokeWidth="2" />
            {/* Bottom Half */}
            <line x1={150 + i * 100} y1="550" x2={150 + i * 100} y2="950" stroke="#643a23" strokeWidth="2" />
          </React.Fragment>
        ))}
        {/* Outer Vertical Lines (Continuous) */}
        <line x1="50" y1="50" x2="50" y2="950" stroke="#643a23" strokeWidth="2" />
        <line x1="850" y1="50" x2="850" y2="950" stroke="#643a23" strokeWidth="2" />

        {/* Palaces (Diagonal Lines) */}
        {/* Top Palace */}
        <line x1="350" y1="50" x2="550" y2="250" stroke="#643a23" strokeWidth="2" />
        <line x1="550" y1="50" x2="350" y2="250" stroke="#643a23" strokeWidth="2" />
        {/* Bottom Palace */}
        <line x1="350" y1="750" x2="550" y2="950" stroke="#643a23" strokeWidth="2" />
        <line x1="550" y1="750" x2="350" y2="950" stroke="#643a23" strokeWidth="2" />

        {/* River Text - Rotated back if flipped so they are readable? Actually standard boards have text readable from one side usually. 
            If isFlipped, the whole SVG is rotated. Text will be upside down relative to viewer. 
            But typically river text is Chinese characters which are somewhat okay upside down or oriented for South.
            Let's keep it simple and rotate the whole SVG for the lines/grid. */}
        <text x="250" y="515" textAnchor="middle" fontSize="60" fontFamily="ZCOOL XiaoWei" fill="#7a4526" opacity="0.8" transform={isFlipped ? "rotate(180, 250, 515)" : ""}>楚 河</text>
        <text x="650" y="515" textAnchor="middle" fontSize="60" fontFamily="ZCOOL XiaoWei" fill="#7a4526" opacity="0.8" transform={isFlipped ? "rotate(180, 650, 515)" : ""}>漢 界</text>

        {/* Interaction Markers (Little crosses) */}
        {[
          // Cannons/Soldiers rows usually have these
          { x: 1, y: 2 }, { x: 7, y: 2 },
          { x: 0, y: 3 }, { x: 2, y: 3 }, { x: 4, y: 3 }, { x: 6, y: 3 }, { x: 8, y: 3 },
          { x: 1, y: 7 }, { x: 7, y: 7 },
          { x: 0, y: 6 }, { x: 2, y: 6 }, { x: 4, y: 6 }, { x: 6, y: 6 }, { x: 8, y: 6 },
        ].map((p, idx) => (
          <g key={`mark-${idx}`} transform={`translate(${50 + p.x * 100}, ${50 + p.y * 100})`}>
            <path d="M-10,-25 v10 h10 M10,-25 v10 h-10 M-10,25 v-10 h10 M10,25 v-10 h-10" fill="none" stroke="#643a23" strokeWidth="2" transform={p.x === 0 ? "translate(15,0)" : p.x === 8 ? "translate(-15,0)" : ""} />
          </g>
        ))}
      </svg>

      {/* Grid Click Layer (Invisible) */}
      <div className="absolute inset-0 grid grid-cols-9 grid-rows-10 z-0">
        {gridPoints.map((pos) => {
          // If flipped, the visual top-left (0,0 in loop) corresponds to logical (8,9)
          // But we can just use VisualPos for styling and LogicPos for handler?
          // Wait, this is a distinct grid div. 
          // It's a grid-cols-9. The first cell (0,0) is top-left.
          // If flipped, top-left is logical (8,9).
          // So we need to map the loop index to logical position.
          const logicalPos = isFlipped ? { x: 8 - pos.x, y: 9 - pos.y } : pos;

          // Actually, gridPoints is just linear list of {x,y} 0..8, 0..9.
          // But rendered in CSS Grid order (Row 0 Col 0, Row 0 Col 1...).
          // So if isFlipped, Row 0 Col 0 corresponds to Logical (8,9).
          // No, wait. 
          // Row 0 (top) Col 0 (left).
          // Standard: (0,0). Flipped: (8,9).
          // But gridPoints generation:
          // y=0, x=0 -> points[0].
          // If we just map onClick to correct logic:

          return (
            <div
              key={`${pos.x}-${pos.y}`} // Loop key
              className="w-full h-full cursor-pointer hover:bg-black/5 rounded-full transition-colors"
              onClick={() => isMyTurn && onSquareClick(logicalPos)}
            />
          );
        })}
      </div>

      {/* Pieces */}
      {pieces.map((piece) => (
        <Piece
          key={piece.id}
          piece={piece}
          isSelected={selectedPieceId === piece.id}
          onClick={() => isMyTurn && onPieceClick(piece)}
          lastMoveSource={lastMove?.from.x === piece.position.x && lastMove?.from.y === piece.position.y}
          lastMoveTarget={lastMove?.to.x === piece.position.x && lastMove?.to.y === piece.position.y}
          isFlipped={isFlipped}
        />
      ))}

      {/* Last Move Indicator */}
      {lastMove && (
        <div
          className="absolute w-[20px] h-[20px] bg-blue-500/30 rounded-full z-0 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
          style={{

            // The previous code had specific magic numbers * 88 + 6. 
            // Let's try to stick to standard % logic: (x / 8) * 100% is left edge. 
            // Center is + (11.11 / 2)%.
            // Let's use the standard calc: left: (x * 100/8)%. 
            // The magic numbers might have been fine tuning.
            // I'll stick to the original magic numbers logic but applied to visual pos.
            left: `${(getVisualPos(lastMove.from).x / 8) * 88 + 6}%`,
            top: `${(getVisualPos(lastMove.from).y / 9) * 89 + 5.5}%`,
          }}
        />
      )}

    </div>
  );
};
