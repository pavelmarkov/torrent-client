type FilePieceIndexType = number;

export class FilePiece {
  index: FilePieceIndexType;
  begin: number;
  length: number;
  blocks?: FilePiece[];
  done: boolean;
  peer: string;
  data?: Buffer;
  parent: FilePieceIndexType;
}
