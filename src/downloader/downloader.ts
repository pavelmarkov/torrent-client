import { DEFAULT_BLOBK_SIZE } from "../consts";
import { FilePiece } from "../types/downloader.dto";

export class Downloader {

  parts: FilePiece[];
  current: { pieceIndex: number, blockIndes: number; };
  downloaded: {
    [k: string]: Buffer;
  };

  public prepareParts(fileSize: number, pieceSize: number): void {
    this.parts = this.divideByBlocks(fileSize, pieceSize);
    this.parts.forEach(piece => {
      piece.blocks = this.divideByBlocks(piece.length, DEFAULT_BLOBK_SIZE);
    });
  };

  private divideByBlocks(totalSize: number, blockSize: number): FilePiece[] {
    const parts: FilePiece[] = [];
    for (let remaining = totalSize, index = 0; remaining > 0; remaining -= blockSize, index++) {
      const begin = totalSize - remaining;
      if (remaining > blockSize) {
        parts.push({ index, length: blockSize, begin });
      } else {
        parts.push({ index, length: remaining, begin });
      }
    }
    return parts;
  }

}