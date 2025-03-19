import * as fs from 'fs';
import * as path from 'path';
import { Parser } from './bencode/parser';
import { Encoder } from './bencode/encoder';
import { IMetainfoFile } from './types/metainfo-file-structure.interface';
import { getPeersHttp } from './tracker/tracker';
import { createInfoHash, decodeInfoFilePieces, generateRandomPeerId } from './cryptography/cryptography';
import { GetPeersRequestDto } from './types/peers.dto';
import { peerHandhake, preparePeerHandshakeMessage } from './peer/peer';

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
    const pieceInfoHashes = decodeInfoFilePieces(metaFile.info.pieces);
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

    const peersData = await getPeersHttp(metaFile.announce, requestPeersParams);
    const handshakeMessage = preparePeerHandshakeMessage(hash, peerId);
    const foundPeer = await peerHandhake(peersData.peers[0], handshakeMessage);

    console.log(metaFile);
    console.log(pieceInfoHashes);
    console.log(peersData);
    console.log(foundPeer);
  });
}

const filePath = path.join(magnetFilesPath, magnetFileName);
readMagnet(filePath);