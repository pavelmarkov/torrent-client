import {
  IInfo,
  IMetainfoFile,
} from "../core/types/metainfo-file-structure.interface";

type ParsedMagnetType =
  | { [k: string]: ParsedMagnetType }
  | ParsedMagnetType[]
  | number
  | string
  | IMetainfoFile;

export class Encoder {
  private splitSymbol: string = ":";
  private dictionarySymbol: string = "d";
  private listSymbol: string = "l";
  private integerSymbol: string = "i";
  private endSymbol: string = "e";

  encode(content: ParsedMagnetType | IInfo | any): string {
    if (Array.isArray(content)) {
      return this.encodeList(content);
    }
    if (typeof content === "object") {
      return this.encodeDictionary(content);
    }
    if (typeof content === "number") {
      return this.encodeInteger(content);
    }
    if (typeof content === "string") {
      return this.encodeString(content);
    }
    return "";
  }

  private encodeDictionary(
    dictionary: { [k: string]: ParsedMagnetType } | IMetainfoFile | IInfo
  ): string {
    const objectKeys = Object.keys(dictionary).sort((key1, key2) =>
      key1.localeCompare(key2)
    );
    console;
    const encodedParts = [];
    for (const objectKey of objectKeys) {
      const encodedKey = this.encode(objectKey);
      const encodedData = this.encode(dictionary[objectKey]);
      encodedParts.push(encodedKey);
      encodedParts.push(encodedData);
    }

    return this.dictionarySymbol + encodedParts.join("") + this.endSymbol;
  }

  private encodeList(list: ParsedMagnetType[]): string {
    const parts: string[] = [];

    for (const part of list) {
      const encodedPart = this.encode(part);
      parts.push(encodedPart);
    }

    return this.listSymbol + parts.join("") + this.endSymbol;
  }

  private encodeInteger(integer: number): string {
    return this.integerSymbol + integer + this.endSymbol;
  }

  private encodeString(part: string): string {
    return part.length + this.splitSymbol + part;
  }
}
