import { DEFAULT_BLOBK_SIZE } from "../consts";
import { FilePiece } from "../types/downloader.dto";

export class Downloader {

  parts: FilePiece[];
  current: { pieceIndex: number, blockIndes: number; };
  downloadedBlocks: {
    [k: string]: Buffer;
  };
  uploaded: number;
  downloaded: number;
  left: number;

  constructor(fileSize: number, pieceSize: number) {
    this.uploaded = 0;
    this.downloaded = 0;
    this.left = fileSize;
    this.parts = this.divideByBlocks(fileSize, pieceSize);
    this.parts.forEach(piece => {
      piece.blocks = this.divideByBlocks(piece.length, DEFAULT_BLOBK_SIZE);
    });
  }

  public prepareParts(): void {
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