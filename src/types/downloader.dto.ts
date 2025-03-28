export class FilePiece {
  index: number;
  begin: number;
  length: number;
  blocks?: FilePiece[];
}