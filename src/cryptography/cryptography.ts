import * as crypto from 'crypto';

export function createInfoHash(bencodedInfoString: string): string {
  const sha1 = crypto.createHash('sha1');
  sha1.update(Buffer.from(bencodedInfoString, 'binary'));
  const hash = sha1.digest('hex');
  return hash;
}

export function generateRandomPeerId() {
  const peerId = crypto.randomBytes(10).toString('hex');
  return peerId;
}

export function decodeInfoFilePieces(peices: string): string[] {
  const binaryPieces = Buffer.from(peices, 'binary');
  const piecesNum = Math.floor(binaryPieces.length / 20);
  const pieces: string[] = [];

  for (let pieceNum = 0; pieceNum < piecesNum; pieceNum++) {
    const shift = pieceNum * 20;
    const pieceArray = [];
    for (let byteNum = 0; byteNum < 20; byteNum++) {
      const byte = binaryPieces.readUInt8(shift + byteNum);
      pieceArray.push(byte.toString(16));
    }
    pieces.push(pieceArray.join('').toString());
  }

  return pieces;
}

