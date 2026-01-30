import { Piece, PieceType, PlayerColor } from './types';

// Helper to create initial pieces
const createPiece = (id: string, type: PieceType, color: PlayerColor, x: number, y: number): Piece => ({
  id, type, color, position: { x, y }
});

export const INITIAL_BOARD_SETUP = (): Piece[] => {
  const pieces: Piece[] = [];
  let idCounter = 0;
  const getId = () => `piece-${idCounter++}`;

  // Red Side (Bottom, y=9 to y=5)
  // Green Side (Top, y=0 to y=4)

  const setupSide = (color: PlayerColor) => {
    const isRed = color === PlayerColor.RED;
    const backRow = isRed ? 9 : 0;
    const cannonRow = isRed ? 7 : 2;
    const soldierRow = isRed ? 6 : 3;

    // Chariots
    pieces.push(createPiece(getId(), PieceType.CHARIOT, color, 0, backRow));
    pieces.push(createPiece(getId(), PieceType.CHARIOT, color, 8, backRow));

    // Horses
    pieces.push(createPiece(getId(), PieceType.HORSE, color, 1, backRow));
    pieces.push(createPiece(getId(), PieceType.HORSE, color, 7, backRow));

    // Elephants
    pieces.push(createPiece(getId(), PieceType.ELEPHANT, color, 2, backRow));
    pieces.push(createPiece(getId(), PieceType.ELEPHANT, color, 6, backRow));

    // Advisors
    pieces.push(createPiece(getId(), PieceType.ADVISOR, color, 3, backRow));
    pieces.push(createPiece(getId(), PieceType.ADVISOR, color, 5, backRow));

    // General
    pieces.push(createPiece(getId(), PieceType.GENERAL, color, 4, backRow));

    // Cannons
    pieces.push(createPiece(getId(), PieceType.CANNON, color, 1, cannonRow));
    pieces.push(createPiece(getId(), PieceType.CANNON, color, 7, cannonRow));

    // Soldiers
    for (let i = 0; i < 5; i++) {
      pieces.push(createPiece(getId(), PieceType.SOLDIER, color, i * 2, soldierRow));
    }
  };

  setupSide(PlayerColor.GREEN);
  setupSide(PlayerColor.RED);

  return pieces;
};

export const CHINESE_LABELS: Record<string, string> = {
  [`${PlayerColor.RED}_${PieceType.GENERAL}`]: '帥',
  [`${PlayerColor.RED}_${PieceType.ADVISOR}`]: '仕',
  [`${PlayerColor.RED}_${PieceType.ELEPHANT}`]: '相',
  [`${PlayerColor.RED}_${PieceType.HORSE}`]: '馬',
  [`${PlayerColor.RED}_${PieceType.CHARIOT}`]: '車',
  [`${PlayerColor.RED}_${PieceType.CANNON}`]: '炮',
  [`${PlayerColor.RED}_${PieceType.SOLDIER}`]: '兵',

  [`${PlayerColor.GREEN}_${PieceType.GENERAL}`]: '將',
  [`${PlayerColor.GREEN}_${PieceType.ADVISOR}`]: '士',
  [`${PlayerColor.GREEN}_${PieceType.ELEPHANT}`]: '象',
  [`${PlayerColor.GREEN}_${PieceType.HORSE}`]: '馬',
  [`${PlayerColor.GREEN}_${PieceType.CHARIOT}`]: '車',
  [`${PlayerColor.GREEN}_${PieceType.CANNON}`]: '砲',
  [`${PlayerColor.GREEN}_${PieceType.SOLDIER}`]: '卒',
};
