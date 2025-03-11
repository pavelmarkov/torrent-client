import { IMetainfoFile } from "../types/metainfo-file-structure.interface";

type ParsedMagnetType = { [k: string]: ParsedMagnetType; } | ParsedMagnetType[] | number | string | IMetainfoFile;

interface IParsedElement {
  data: ParsedMagnetType;
  length: number;
}

export class Parser {
  private splitSymbol: string = ':';
  private dictionarySymbol: string = 'd';
  private listSymbol: string = 'l';
  private integerSymbol: string = 'i';
  private endSymbol: string = 'e';

  parse(content: string): IParsedElement {
    if (content.startsWith(this.dictionarySymbol)) {
      return this.parseDictionary(content);
    }
    if (content.startsWith(this.listSymbol)) {
      return this.parseList(content);
    }
    if (content.startsWith(this.endSymbol)) {
      return this.parseEnd(content);
    }
    if (content.startsWith(this.integerSymbol)) {
      return this.parseInteger(content);
    }
    if (content.length && this.isDigit(content[0])) {
      return this.parseString(content);
    }
    return {
      data: content,
      length: content.length,
    };
  }

  private isDigit(character: string): boolean {
    return /^[0-9]$/.test(character);
  }

  private parseDictionary(part: string): IParsedElement {
    let cursor = 0;
    const partLength = part.length;

    const dictionary: { [k: string]: ParsedMagnetType; } = {};

    cursor += this.dictionarySymbol.length;

    while (cursor <= partLength) {
      const parsedKey = this.parse(part.substring(cursor, partLength));
      const key = <string>parsedKey.data;
      cursor += parsedKey.length;
      if (!parsedKey.data) {
        break;
      }

      const parsedKeyContent = this.parse(part.substring(cursor, partLength));
      cursor += parsedKeyContent.length;

      if (parsedKeyContent.data === null) {
        break;
      }

      dictionary[key] = parsedKeyContent.data;
    }

    return {
      data: dictionary,
      length: cursor
    };
  }

  private parseList(part: string): IParsedElement {
    let cursor = 0;
    const partLength = part.length;

    const list: ParsedMagnetType[] = [];

    cursor += this.listSymbol.length;

    while (cursor <= partLength) {
      const parsedLinkContent = this.parse(part.substring(cursor, partLength));
      cursor += parsedLinkContent.length;
      if (!parsedLinkContent.data) {
        break;
      }
      list.push(parsedLinkContent.data);
    }

    return { data: list, length: cursor };
  }

  private parseEnd(part: string): IParsedElement {
    let cursor = 0;

    cursor += this.endSymbol.length;

    return { data: null, length: cursor };
  }

  private parseInteger(part: string): IParsedElement {
    let cursor = 0;

    cursor += this.integerSymbol.length;

    const integer = part.substring(cursor, part.indexOf(this.endSymbol));
    cursor += integer.length + this.endSymbol.length;

    return { data: Number(integer), length: cursor };
  }

  private parseString(part: string): IParsedElement {
    let cursor = 0;
    const stringContentSize = part.substring(cursor, part.indexOf(this.splitSymbol));
    cursor += stringContentSize.length + this.splitSymbol.length;
    const stringContent = part.substring(cursor, cursor + Number(stringContentSize));
    cursor += Number(stringContentSize);

    return {
      data: stringContent,
      length: cursor,
    };
  }
}