import * as fs from "fs";
import { TorrentFileInfo } from "../core/types/torrent-file-info";
import { Encoder } from "../bencode/encoder";
import { Parser } from "../bencode/parser";
import { IMetainfoFile } from "../core/types/metainfo-file-structure.interface";
import { Logger } from "../core/logger/logger";

export class TorrentFile {
  readonly path: string;
  meta: IMetainfoFile;
  bencodedInfo: string;
  decodeInfoFilePieces: string[];

  logger: Logger;

  constructor(path: string) {
    this.path = path;

    this.logger = new Logger(TorrentFile.name);
  }

  async readTorrentFile(): Promise<TorrentFileInfo> {
    return new Promise((resolve, reject) => {
      fs.readFile(this.path, "binary", async (error, data) => {
        if (error) {
          reject(error);
        }

        const parser = new Parser();
        const parsedData = parser.parse(data);
        this.meta = <IMetainfoFile>parsedData.data;

        this.logFileInfo();

        const encoder = new Encoder();
        this.bencodedInfo = encoder.encode(this.meta.info);

        this.decodeInfoFilePieces = decodeInfoFilePieces(this.meta.info.pieces);

        resolve(this);
      });
    });
  }

  private logFileInfo(): void {
    this.logger.log(`tracker url: ${this.meta.announce}`);
    this.logger.log(`file name: ${this.meta.info.name}`);
    this.logger.log(`file size: ${this.meta.info.length}`);
  }
}

export function decodeInfoFilePieces(peices: string): string[] {
  const binaryPieces = Buffer.from(peices, "binary");
  const piecesNum = Math.floor(binaryPieces.length / 20);
  const pieces: string[] = [];

  for (let pieceNum = 0; pieceNum < piecesNum; pieceNum++) {
    const shift = pieceNum * 20;
    const pieceArray = [];
    for (let byteNum = 0; byteNum < 20; byteNum++) {
      const byte = binaryPieces.readUInt8(shift + byteNum);
      pieceArray.push(byte.toString(16));
    }
    pieces.push(pieceArray.join("").toString());
  }

  return pieces;
}
