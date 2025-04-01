import { DEFAULT_BLOBK_SIZE } from "../consts";
import { createInfoHash, generateRandomPeerId } from "../cryptography/cryptography";
import { FilePiece } from "../types/downloader.dto";
import { TorrentFileInfo } from "../types/torrent-file-info";
import * as fs from 'fs';
import * as path from 'path';

export class Downloader {

  clientPeerId: string;
  infoHash: string;
  parts: FilePiece[];
  uploaded: number;
  downloaded: number;
  left: number;
  file: {
    name: string;
  };

  constructor(torrentFileInfo: TorrentFileInfo) {
    this.file = { name: torrentFileInfo.meta.info.name };

    this.uploaded = 0;
    this.downloaded = 0;
    this.left = torrentFileInfo.meta.info.length;

    this.infoHash = createInfoHash(torrentFileInfo.bencodedInfo);
    this.clientPeerId = generateRandomPeerId();

    this.parts = this.divideByBlocks(
      torrentFileInfo.meta.info.length,
      torrentFileInfo.meta.info["piece length"],
      null,
    );
    this.parts.forEach(piece => {
      piece.blocks = this.divideByBlocks(piece.length, DEFAULT_BLOBK_SIZE, piece.index);
    });

  }

  private divideByBlocks(totalSize: number, blockSize: number, parentIndex: number): FilePiece[] {
    const parts: FilePiece[] = [];
    for (let remaining = totalSize, index = 0; remaining > 0; remaining -= blockSize, index++) {
      const begin = totalSize - remaining;
      if (remaining > blockSize) {
        parts.push({ index, length: blockSize, begin, done: false, peer: null, parent: parentIndex });
      } else {
        parts.push({ index, length: remaining, begin, done: false, peer: null, parent: parentIndex });
      }
    }
    return parts;
  }

  getNextUndoneBlock(peerId: string): FilePiece {
    for (const part of this.parts) {
      if (!part.done) {
        for (const block of part.blocks) {
          if (!block.done) {
            block.peer = peerId;
            return block;
          }
        }
      }
    }
    return null;
  }

  writeBlock(data: Buffer, pieceIndex: number, blockIndex: number): boolean {
    for (const part of this.parts) {
      if (part.index !== pieceIndex) {
        continue;
      }
      for (const block of part.blocks) {
        if (block.index !== blockIndex) {
          continue;
        }
        block.data = data;
        block.done = true;
      }
      part.done = part.blocks.every(piece => piece.done);
      return true;
    }
    return false;
  }

  saveFile(): void {
    const parts: Buffer[] = [];
    for (const part of this.parts) {
      if (!part.done) {
        continue;
      }
      for (const block of part.blocks) {
        if (!block.done) {
          continue;
        }
        parts.push(block.data);
      }
    }
    fs.writeFile(path.join('./downloaded', this.file.name), Buffer.concat(parts), () => {
      console.log('saving to file');
    });
  }

}