import * as path from 'path';
import { getPeersHttp } from './tracker/tracker';
import { createInfoHash, generateRandomPeerId } from './cryptography/cryptography';
import { GetPeersRequestDto } from './types/peers.dto';
import { Peer, preparePeerHandshakeMessage } from './peer/peer';
import { readTorrentFile } from './torrent-file/torrent-file';
import { Downloader } from './downloader/downloader';

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

  const fileLength = torrentFileInfo.meta.info.length;
  const filePieceLength = torrentFileInfo.meta.info['piece length'];

  const downloader = new Downloader();
  downloader.prepareParts(fileLength, filePieceLength);

  const peer = new Peer(peerId, peersData.peers[0]);
  await peer.download(handshakeMessage, downloader);

  console.log(torrentFileInfo.meta);
  console.log(torrentFileInfo.decodeInfoFilePieces);
  console.log(peersData);
}

const filePath = path.join(magnetFilesPath, magnetFileName);
main(filePath);
