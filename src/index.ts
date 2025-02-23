import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './parser/parser';

const magnetFilesPath = './magnet';
const magnetFileName = 'test.torrent';

async function readMagnet(path: string): Promise<void> {
  fs.readFile(path, 'utf8', (error, data) => {
    if (error) {
      console.log(error);
      return;
    }
    const parser = new Parser();
    const parsedData = parser.parse(data);
    console.log(parsedData);
  });
}

const filePath = path.join(magnetFilesPath, magnetFileName);
readMagnet(filePath);