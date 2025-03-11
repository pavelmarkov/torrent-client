import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './bencode/parser';
import { Encoder } from './bencode/encoder';
import { IMetainfoFile } from './types/metainfo-file-structure.interface';
import { getPeersHttp } from './tracker/tracker';
import { createInfoHash, generateRandomPeerId } from './cryptography/cryptography';
import { GetPeersRequestDto } from './types/peers.dto';

const magnetFilesPath = './magnet';
const magnetFileName = 'sample.torrent';

async function readMagnet(path: string): Promise<void> {
  fs.readFile(path, 'binary', async (error, data) => {
    if (error) {
      console.log(error);
      return;
    }
    const parser = new Parser();
    const parsedData = parser.parse(data);
    const metaFile: IMetainfoFile = <IMetainfoFile>parsedData.data;
    const encoder = new Encoder();
    const encodedData = encoder.encode(metaFile.info);

    const hash = createInfoHash(encodedData);
    const peerId = generateRandomPeerId();
    const requestPeersParams: GetPeersRequestDto = {
      info_hash: hash,
      peer_id: peerId,
      port: null,
      uploaded: 0,
      downloaded: 0,
      left: metaFile.info.length,
      compact: 1,
    };

    const res = getPeersHttp(metaFile.announce, requestPeersParams).then((data) => {
      const responseData = parser.parse(data);
      const peersBuffer = Buffer.from(responseData['data']['peers'], 'binary');
      const numPeers = Math.floor(peersBuffer.length / 6);
      const peerList = [];
      for (let peerNum = 0; peerNum < numPeers; peerNum++) {
        const shift = peerNum * 6;
        const ip = `${peersBuffer[shift]}.${peersBuffer[shift + 1]}.${peersBuffer[shift + 2]}.${peersBuffer[shift + 3]}`;
        const port = peersBuffer.readUInt16BE(shift + 4);
        peerList.push({ ip, port });
      }
      console.log(peerList);
    });
  });
}

const filePath = path.join(magnetFilesPath, magnetFileName);
readMagnet(filePath);