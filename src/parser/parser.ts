type ParsedMagnetType = { [k: string]: ParsedMagnetType; } | ParsedMagnetType[] | number | string;

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

    let cursor = 0;
    const stringContentSize = content.substring(cursor, content.indexOf(this.splitSymbol));
    cursor += stringContentSize.length + this.splitSymbol.length;
    const stringContent = content.substring(cursor, cursor + Number(stringContentSize));
    cursor += Number(stringContentSize);

    return {
      data: stringContent,
      length: cursor,
    };
  }

  parseDictionary(part: string): IParsedElement {
    let cursor = 0;
    const partLength = part.length;

    const dictionary: { [k: string]: ParsedMagnetType; } = {};

    cursor += this.dictionarySymbol.length;

    while (cursor <= partLength) {
      const parsedKey = this.parse(part.substring(cursor, partLength));
      const key = <string>parsedKey.data;
      cursor += parsedKey.length;

      const parsedKeyContent = this.parse(part.substring(cursor, partLength));
      cursor += parsedKeyContent.length;
      if (!parsedKeyContent.data) {
        break;
      }
      dictionary[key] = parsedKeyContent.data;
    }

    return {
      data: dictionary,
      length: cursor
    };
  }

  parseList(part: string): IParsedElement {
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

  parseEnd(part: string): IParsedElement {
    let cursor = 0;

    cursor += this.endSymbol.length;

    return { data: null, length: cursor };
  }

  parseInteger(part: string): IParsedElement {
    let cursor = 0;

    cursor += this.integerSymbol.length;

    const integer = part.substring(cursor, part.indexOf(this.endSymbol));
    cursor += integer.length + this.endSymbol.length;

    return { data: Number(integer), length: cursor };
  }
}