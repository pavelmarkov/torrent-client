import { IMetainfoFile } from "./metainfo-file-structure.interface";

export class TorrentFileInfo {
  meta: IMetainfoFile;
  bencodedInfo: string;
  decodeInfoFilePieces: string[];
}
