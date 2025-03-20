import * as path from 'path';
import { getPeersHttp } from './tracker/tracker';
import { createInfoHash, generateRandomPeerId } from './cryptography/cryptography';
import { GetPeersRequestDto } from './types/peers.dto';
import { peerHandhake, preparePeerHandshakeMessage } from './peer/peer';
import { readTorrentFile } from './torrent-file/torrent-file';

const magnetFilesPath = './magnet';
const magnetFileName = 'sample.torrent';

async function main(path: string): Promise<void> {
  const torrentFileInfo = await readTorrentFile(path);

  const hash = createInfoHash(torrentFileInfo.bencodedInfo);
  const peerId = generateRandomPeerId();

  const requestPeersParams: GetPeersRequestDto = {
    info_hash: hash,
    peer_id: peerId,
    port: null,
    uploaded: 0,
    downloaded: 0,
    left: torrentFileInfo.meta.info.length,
    compact: 1,
  };

  const peersData = await getPeersHttp(torrentFileInfo.meta.announce, requestPeersParams);
  const handshakeMessage = preparePeerHandshakeMessage(hash, peerId);
  const foundPeer = await peerHandhake(peersData.peers[0], handshakeMessage);

  console.log(torrentFileInfo.meta);
  console.log(torrentFileInfo.decodeInfoFilePieces);
  console.log(peersData);
  console.log(foundPeer);
}

const filePath = path.join(magnetFilesPath, magnetFileName);
main(filePath);
