import { DEFAULT_BLOBK_SIZE } from "../consts";
import { createInfoHash, generateRandomPeerId } from "../cryptography/cryptography";
import { FilePiece } from "../types/downloader.dto";
import { TorrentFileInfo } from "../types/torrent-file-info";

export class Downloader {

  clientPeerId: string;
  infoHash: string;
  parts: FilePiece[];
  current: { pieceIndex: number, blockIndes: number; };
  downloadedBlocks: {
    [k: string]: Buffer;
  };
  uploaded: number;
  downloaded: number;
  left: number;

  constructor(torrentFileInfo: TorrentFileInfo) {
    this.uploaded = 0;
    this.downloaded = 0;
    this.left = torrentFileInfo.meta.info.length;

    this.infoHash = createInfoHash(torrentFileInfo.bencodedInfo);
    this.clientPeerId = generateRandomPeerId();

    this.parts = this.divideByBlocks(
      torrentFileInfo.meta.info.length,
      torrentFileInfo.meta.info["piece length"]
    );
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