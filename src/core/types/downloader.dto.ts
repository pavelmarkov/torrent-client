export type FilePieceIndexType = number;

export class FilePiece {
  index: FilePieceIndexType;
  position: number;
  begin: number;
  length: number;
  blocks?: FilePiece[];
  done: boolean;
  peer: string;
  data?: Buffer;
  parent: FilePieceIndexType;
}
