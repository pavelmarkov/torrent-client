
export interface IMetainfoFile {
  info: IInfo;
  announce: string;
  'announce-list'?: string[];
  'creation date'?: number;
  comment?: string;
  'created by'?: string;
  encoding?: string;
}

export interface IInfo {
  length: number;
  'piece length': number;
  name: string;
  pieces: string;
}
