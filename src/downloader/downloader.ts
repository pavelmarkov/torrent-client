import { DEFAULT_BLOBK_SIZE } from "../core/consts";
import * as crypto from "crypto";
import { FilePiece, FilePieceIndexType } from "../core/types/downloader.dto";
import * as fs from "fs";
import * as path from "path";
import { TorrentFile } from "../torrent-file/torrent-file";
import { Logger } from "../core/logger/logger";

export class Downloader {
  trackerUrl: string;
  clientPeerId: string;
  infoHash: string;
  handshakeMessage: Buffer;

  parts: FilePiece[];

  uploaded: number;
  downloaded: number;
  left: number;

  file: {
    name: string;
    size: number;
    path: string;
  };

  saveDirectory: string;

  logger: Logger;

  constructor(torrentFileInfo: TorrentFile, saveDirectory: string) {
    this.logger = new Logger(Downloader.name);

    this.trackerUrl = torrentFileInfo.meta.announce;

    const filePath = path.join(saveDirectory, torrentFileInfo.meta.info.name);
    this.file = {
      name: torrentFileInfo.meta.info.name,
      size: torrentFileInfo.meta.info.length,
      path: filePath,
    };

    this.uploaded = 0;
    this.downloaded = 0;
    this.left = torrentFileInfo.meta.info.length;

    this.infoHash = this.createInfoHash(torrentFileInfo.bencodedInfo);
    this.clientPeerId = this.generateRandomPeerId();
    this.handshakeMessage = this.preparePeerHandshakeMessage();

    this.parts = this.divideByBlocks(
      torrentFileInfo.meta.info.length,
      torrentFileInfo.meta.info["piece length"],
      null,
      0
    );
    this.parts.forEach((piece) => {
      piece.blocks = this.divideByBlocks(
        piece.length,
        DEFAULT_BLOBK_SIZE,
        piece.index,
        piece.position
      );
    });

    console.dir(this.parts, { depth: null });
  }

  private divideByBlocks(
    totalSize: number,
    blockSize: number,
    parentIndex: number,
    parentPositon: number
  ): FilePiece[] {
    const parts: FilePiece[] = [];
    for (
      let remaining = totalSize, index = 0;
      remaining > 0;
      remaining -= blockSize, index++
    ) {
      const begin = totalSize - remaining;
      const position = begin + parentPositon;
      if (blockSize > remaining) {
        parts.push({
          index,
          position,
          length: remaining,
          begin,
          done: false,
          peer: null,
          parent: parentIndex,
        });
        continue;
      }
      parts.push({
        index,
        position,
        length: blockSize,
        begin,
        done: false,
        peer: null,
        parent: parentIndex,
      });
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
        block.done = true;
        this.writeDataChunkToFile(data, block);
        this.progress(block);
      }
      part.done = part.blocks.every((piece) => piece.done);
      return true;
    }
    return false;
  }

  private async writeDataChunkToFile(
    data: Buffer,
    block: FilePiece
  ): Promise<boolean> {
    const writeStream = fs.createWriteStream(this.file.path, {
      start: block.position,
      flags: "a",
    });

    return new Promise((resolve, reject) => {
      writeStream.write(data, (err) => {
        if (err) {
          this.logger.error(`error writing to file at position ${block.begin}`);
          block.done = false;
          reject(false);
        }
        this.logger.log(`wrote data to file at position ${block.begin}`);
        block.done = true;
        this.isFilePartDone(block.parent);
        writeStream.close();
        this.logger.log(`stream closed`);
        resolve(true);
      });
    });
  }

  isFilePartDone(partIndex: FilePieceIndexType): boolean {
    const part = this.parts.find((part) => part.index === partIndex);
    part.done = part.blocks.every((piece) => piece.done);
    if (part.done) {
      this.logger.log(`part with index ${part.index} is finished`);
    } else {
      this.logger.log(`part with index ${part.index} is not finished`);
    }
    return part.done;
  }

  progress(doneBlock: FilePiece): void {
    this.left -= doneBlock.length;
    this.downloaded += doneBlock.length;
    this.logger.log(`${this.file.size}/${this.downloaded}`);
  }

  private createInfoHash(bencodedInfoString: string): string {
    const sha1 = crypto.createHash("sha1");
    sha1.update(Buffer.from(bencodedInfoString, "binary"));
    const hash = sha1.digest("hex");
    return hash;
  }

  private generateRandomPeerId() {
    const peerId = crypto.randomBytes(10).toString("hex");
    return peerId;
  }

  private preparePeerHandshakeMessage(): Buffer {
    const protocolStringLength = Buffer.from([19]);
    const protocolString = Buffer.from("BitTorrent protocol");
    const reservedBytes = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
    const infoHashPart = Buffer.from(this.infoHash, "hex");
    this.logger.log(`encoded info hash: ${infoHashPart.toString("hex")}`);
    const peerIdPart = Buffer.from(this.clientPeerId, "hex");
    return Buffer.concat([
      protocolStringLength,
      protocolString,
      reservedBytes,
      infoHashPart,
      peerIdPart,
    ]);
  }
}
