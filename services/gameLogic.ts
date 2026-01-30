import { Piece, PieceType, PlayerColor, Position, Difficulty } from '../types';

// Utility to find piece at position
const getPieceAt = (pieces: Piece[], pos: Position): Piece | undefined => {
  return pieces.find(p => p.position.x === pos.x && p.position.y === pos.y);
};

const isWithinBoard = (pos: Position) => pos.x >= 0 && pos.x <= 8 && pos.y >= 0 && pos.y <= 9;

const isPalace = (pos: Position, color: PlayerColor) => {
  if (pos.x < 3 || pos.x > 5) return false;
  if (color === PlayerColor.RED) return pos.y >= 7 && pos.y <= 9;
  return pos.y >= 0 && pos.y <= 2;
};

// Simplified rule engine for demo purposes
// Does not implement full "Flying General" check or complex repetition rules
export const isValidMove = (piece: Piece, target: Position, pieces: Piece[]): boolean => {
  if (!isWithinBoard(target)) return false;
  if (piece.position.x === target.x && piece.position.y === target.y) return false;

  const targetPiece = getPieceAt(pieces, target);
  if (targetPiece && targetPiece.color === piece.color) return false; // Cannot capture own piece

  const dx = target.x - piece.position.x;
  const dy = target.y - piece.position.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  switch (piece.type) {
    case PieceType.GENERAL:
      // Flying General Rule: Can capture opponent general if facing directly with no obstacles
      if (targetPiece && targetPiece.type === PieceType.GENERAL && targetPiece.color !== piece.color) {
        if (piece.position.x === target.x) {
          const obstacles = countObstacles(piece.position, target, pieces);
          if (obstacles === 0) return true;
        }
      }

      // Standard Move: 1 step orthogonal, stay in palace
      return (absDx + absDy === 1) && isPalace(target, piece.color);

    case PieceType.ADVISOR:
      // Move 1 step diagonal, stay in palace
      return (absDx === 1 && absDy === 1) && isPalace(target, piece.color);

    case PieceType.ELEPHANT:
      // Move 2 steps diagonal, cannot cross river, check blocking eye
      if (absDx !== 2 || absDy !== 2) return false;
      // River check
      if (piece.color === PlayerColor.RED && target.y < 5) return false;
      if (piece.color === PlayerColor.GREEN && target.y > 4) return false;
      // Eye check
      const eyeX = piece.position.x + dx / 2;
      const eyeY = piece.position.y + dy / 2;
      if (getPieceAt(pieces, { x: eyeX, y: eyeY })) return false;
      return true;

    case PieceType.HORSE:
      // Move L shape, check blocking leg
      if (!((absDx === 1 && absDy === 2) || (absDx === 2 && absDy === 1))) return false;
      // Leg check
      const legX = piece.position.x + (absDx === 2 ? dx / 2 : 0);
      const legY = piece.position.y + (absDy === 2 ? dy / 2 : 0);
      if (getPieceAt(pieces, { x: legX, y: legY })) return false;
      return true;

    case PieceType.CHARIOT:
      // Straight line, no obstacles
      if (dx !== 0 && dy !== 0) return false;
      return countObstacles(piece.position, target, pieces) === 0;

    case PieceType.CANNON:
      // Move straight: 0 obstacles. Capture straight: 1 obstacle (screen).
      if (dx !== 0 && dy !== 0) return false;
      const obstacles = countObstacles(piece.position, target, pieces);
      if (targetPiece) {
        // Capture needs exactly 1 screen
        return obstacles === 1;
      } else {
        // Move needs 0 obstacles
        return obstacles === 0;
      }

    case PieceType.SOLDIER:
      // Forward 1 step. After river, can move side 1 step.
      const forward = piece.color === PlayerColor.RED ? -1 : 1;
      // Check moving backwards
      if (piece.color === PlayerColor.RED && dy > 0) return false;
      if (piece.color === PlayerColor.GREEN && dy < 0) return false;

      const crossedRiver = piece.color === PlayerColor.RED ? piece.position.y <= 4 : piece.position.y >= 5;

      if (absDx === 0 && dy === forward) return true; // Forward 1
      if (crossedRiver && absDx === 1 && dy === 0) return true; // Side 1 after river
      return false;
  }

  return false;
};

const countObstacles = (from: Position, to: Position, pieces: Piece[]): number => {
  let count = 0;
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let currX = from.x + dx;
  let currY = from.y + dy;

  while (currX !== to.x || currY !== to.y) {
    if (getPieceAt(pieces, { x: currX, y: currY })) count++;
    currX += dx;
    currY += dy;
  }
  return count;
};

// Check if a specific player's General is under attack
export const isInCheck = (pieces: Piece[], kingColor: PlayerColor): boolean => {
  const king = pieces.find(p => p.type === PieceType.GENERAL && p.color === kingColor);
  if (!king) return false; // Should not happen in normal play unless captured

  const enemyColor = kingColor === PlayerColor.RED ? PlayerColor.GREEN : PlayerColor.RED;
  const enemies = pieces.filter(p => p.color === enemyColor);

  return enemies.some(enemy => isValidMove(enemy, king.position, pieces));
};

// Basic AI (Greedy + Random)
export const getAIMove = (pieces: Piece[], aiColor: PlayerColor, difficulty: Difficulty = Difficulty.MEDIUM): { from: Position, to: Position } | null => {
  // EASY: Pure Random
  if (difficulty === Difficulty.EASY) {
    const myPieces = pieces.filter(p => p.color === aiColor);
    const allMoves: { from: Position, to: Position }[] = [];

    for (const piece of myPieces) {
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 9; y++) {
          const target = { x, y };
          if (isValidMove(piece, target, pieces)) {
            allMoves.push({ from: piece.position, to: target });
          }
        }
      }
    }

    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
  }

  // MEDIUM: Greedy (Original Implementation)
  if (difficulty === Difficulty.MEDIUM) {
    const myPieces = pieces.filter(p => p.color === aiColor);
    let validMoves: { piece: Piece, to: Position, score: number }[] = [];

    for (const piece of myPieces) {
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 9; y++) {
          const target = { x, y };
          if (isValidMove(piece, target, pieces)) {
            let score = Math.random() * 10; // Base random score
            const targetPiece = getPieceAt(pieces, target);
            if (targetPiece) {
              // Capture logic
              score += getPieceValue(targetPiece.type) * 10;
            }
            validMoves.push({ piece, to: target, score });
          }
        }
      }
    }

    if (validMoves.length === 0) return null;
    validMoves.sort((a, b) => b.score - a.score);
    const topMoves = validMoves.slice(0, 3);
    const selected = topMoves[Math.floor(Math.random() * topMoves.length)];
    return { from: selected.piece.position, to: selected.to };
  }

  // HARD: Minimax Depth 2
  if (difficulty === Difficulty.HARD) {
    return getBestMoveMinimax(pieces, aiColor, 2);
  }

  return null;
};

// Minimax Implementation
const getBestMoveMinimax = (pieces: Piece[], aiColor: PlayerColor, depth: number): { from: Position, to: Position } | null => {
  let bestScore = -Infinity;
  let bestMoves: { from: Position, to: Position }[] = [];
  const myPieces = pieces.filter(p => p.color === aiColor);

  // Generate all moves
  for (const piece of myPieces) {
    // Optimization: prioritize capturing moves or center moves to prune implicitly? 
    // For now just iterate board.
    // To optimize, we can limit checking to relevant squares or piece moves.
    // Here we stick to board iteration for simplicity as per original code structure, 
    // but realistically we should iterate piece capabilities.
    // Since we don't have a 'getValidMoves' function returning a list, we iterate board.
    for (let x = 0; x <= 8; x++) {
      for (let y = 0; y <= 9; y++) {
        const target = { x, y };
        if (isValidMove(piece, target, pieces)) {
          // Simulate Move
          const nextPieces = executeVirtualMove(pieces, piece.position, target);
          const score = minimax(nextPieces, depth - 1, false, aiColor, -Infinity, Infinity);

          if (score > bestScore) {
            bestScore = score;
            bestMoves = [{ from: piece.position, to: target }];
          } else if (score === bestScore) {
            bestMoves.push({ from: piece.position, to: target });
          }
        }
      }
    }
  }

  if (bestMoves.length === 0) return null;
  return bestMoves[Math.floor(Math.random() * bestMoves.length)];
}

const minimax = (pieces: Piece[], depth: number, isMaximizing: boolean, aiColor: PlayerColor, alpha: number, beta: number): number => {
  const winner = checkWinner(pieces);
  if (winner) {
    return winner === aiColor ? 10000 + depth : -10000 - depth;
  }
  if (depth === 0) {
    return evaluateBoard(pieces, aiColor);
  }

  const turnColor = isMaximizing ? aiColor : (aiColor === PlayerColor.RED ? PlayerColor.GREEN : PlayerColor.RED);
  const currentPieces = pieces.filter(p => p.color === turnColor);

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const piece of currentPieces) {
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 9; y++) {
          const target = { x, y };
          if (isValidMove(piece, target, pieces)) {
            const nextPieces = executeVirtualMove(pieces, piece.position, target);
            const evalScore = minimax(nextPieces, depth - 1, false, aiColor, alpha, beta);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) return maxEval;
          }
        }
      }
    }
    return maxEval === -Infinity ? 0 : maxEval; // No moves ?
  } else {
    let minEval = Infinity;
    for (const piece of currentPieces) {
      for (let x = 0; x <= 8; x++) {
        for (let y = 0; y <= 9; y++) {
          const target = { x, y };
          if (isValidMove(piece, target, pieces)) {
            const nextPieces = executeVirtualMove(pieces, piece.position, target);
            const evalScore = minimax(nextPieces, depth - 1, true, aiColor, alpha, beta);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) return minEval;
          }
        }
      }
    }
    return minEval === Infinity ? 0 : minEval;
  }
}

const executeVirtualMove = (pieces: Piece[], from: Position, to: Position): Piece[] => {
  return pieces.filter(p => !(p.position.x === to.x && p.position.y === to.y)).map(p => {
    if (p.position.x === from.x && p.position.y === from.y) {
      return { ...p, position: to };
    }
    return p;
  });
}

const evaluateBoard = (pieces: Piece[], aiColor: PlayerColor): number => {
  let score = 0;
  pieces.forEach(p => {
    const value = getPieceValue(p.type);
    if (p.color === aiColor) {
      score += value;
      // Positional bonus could go here
    } else {
      score -= value;
    }
  });
  return score;
}

const getPieceValue = (type: PieceType): number => {
  switch (type) {
    case PieceType.GENERAL: return 1000;
    case PieceType.CHARIOT: return 90;
    case PieceType.CANNON: return 45;
    case PieceType.HORSE: return 40;
    case PieceType.ELEPHANT: return 20;
    case PieceType.ADVISOR: return 20;
    case PieceType.SOLDIER: return 10;
    default: return 0;
  }
};

export const checkWinner = (pieces: Piece[]): PlayerColor | null => {
  const redGen = pieces.find(p => p.type === PieceType.GENERAL && p.color === PlayerColor.RED);
  const greenGen = pieces.find(p => p.type === PieceType.GENERAL && p.color === PlayerColor.GREEN);
  if (!redGen) return PlayerColor.GREEN;
  if (!greenGen) return PlayerColor.RED;
  return null;
};