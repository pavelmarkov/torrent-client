import * as path from 'path';
import { getPeersHttp } from './tracker/tracker';
import { createInfoHash, generateRandomPeerId } from './cryptography/cryptography';
import { Peer } from './peer/peer';
import { readTorrentFile } from './torrent-file/torrent-file';
import { Downloader } from './downloader/downloader';

const magnetFilesPath = './magnet';
const magnetFileName = 'sample.torrent';

async function main(path: string): Promise<void> {

  const torrentFileInfo = await readTorrentFile(path);

  const downloader = new Downloader(
    torrentFileInfo.meta.info.length,
    torrentFileInfo.meta.info['piece length']
  );

  const hash = createInfoHash(torrentFileInfo.bencodedInfo);
  const peerId = generateRandomPeerId();

  const peersData = await getPeersHttp(torrentFileInfo.meta.announce, hash, peerId, downloader);

  const peer = new Peer(peersData.peers[0], peerId, hash);
  await peer.download(downloader);

  console.log(torrentFileInfo.meta);
  console.log(torrentFileInfo.decodeInfoFilePieces);
  console.log(peersData);
}

const filePath = path.join(magnetFilesPath, magnetFileName);
main(filePath);
