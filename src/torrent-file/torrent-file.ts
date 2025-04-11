import * as fs from "fs";
import { TorrentFileInfo } from "../core/types/torrent-file-info";
import { Encoder } from "../bencode/encoder";
import { Parser } from "../bencode/parser";
import { IMetainfoFile } from "../core/types/metainfo-file-structure.interface";

export async function readTorrentFile(path: string): Promise<TorrentFileInfo> {
  return new Promise((resolve, reject) => {
    fs.readFile(path, "binary", async (error, data) => {
      if (error) {
        reject(error);
      }

      const result: TorrentFileInfo = {
        meta: null,
        bencodedInfo: null,
        decodeInfoFilePieces: null,
      };

      const parser = new Parser();
      const parsedData = parser.parse(data);
      result.meta = <IMetainfoFile>parsedData.data;

      const encoder = new Encoder();
      result.bencodedInfo = encoder.encode(result.meta.info);

      result.decodeInfoFilePieces = decodeInfoFilePieces(
        result.meta.info.pieces
      );

      resolve(result);
    });
  });
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
