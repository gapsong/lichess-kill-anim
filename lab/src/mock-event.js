import { createRenderEvent } from '../../src/render-event.js';

const DEFAULT_BOARD_SIZE = 480;

// Scene: white queen on c4 captures a black pawn on f7 (a sharp diagonal kill,
// representative of the Qxf7 motif). En passant intentionally not used.
const QXf7_CAPTURE = {
  kind: 'capture',
  ply: 11,
  san: 'Qxf7+',
  from: 'c4',
  to: 'f7',
  movingPiece: 'q',
  movingColor: 'w',
  capturedPiece: 'p',
  capturedColor: 'b',
  capturedAt: 'f7',
  isEnPassant: false
};

export function mockQueenKillEvent({ size = DEFAULT_BOARD_SIZE } = {}) {
  return createRenderEvent(
    QXf7_CAPTURE,
    { size, isBlackOrientation: false },
    'lab-mock'
  );
}
