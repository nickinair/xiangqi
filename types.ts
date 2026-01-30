export enum PlayerColor {
  RED = 'red',
  GREEN = 'green', // User requested Green instead of Black
}

export enum PieceType {
  GENERAL = 'general', // Jiang/Shuai
  ADVISOR = 'advisor', // Shi
  ELEPHANT = 'elephant', // Xiang
  HORSE = 'horse', // Ma
  CHARIOT = 'chariot', // Ju
  CANNON = 'cannon', // Pao
  SOLDIER = 'soldier', // Bing/Zu
}

export interface Position {
  x: number; // 0-8 (File)
  y: number; // 0-9 (Rank)
}

export interface Piece {
  id: string;
  type: PieceType;
  color: PlayerColor;
  position: Position;
}

export interface GameState {
  pieces: Piece[];
  turn: PlayerColor;
  selectedPieceId: string | null;
  lastMove: { from: Position; to: Position } | null;
  winner: PlayerColor | null;
  endReason?: string; // 'checkmate', 'surrender', 'opponent_left'
  history: Piece[][]; // For simple undo
}

export interface User {
  username: string;
  avatarUrl?: string;
  stats: {
    wins: number;
    losses: number;
    rank: number;
  };
}

export enum GameMode {
  LOCAL = 'local',
  AI = 'ai',
  ONLINE = 'online',
}

export enum Difficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
}

export interface Room {
  id: string;
  name: string;
  players: number;
}

export type Language = 'zh' | 'en';