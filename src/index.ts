import * as path from "path";
import { Tracker } from "./tracker/tracker";
import { Peer } from "./peer/peer";
import { TorrentFile } from "./torrent-file/torrent-file";
import { Downloader } from "./downloader/downloader";

const magnetFilesPath = "./magnet";
const magnetFileName = "sample.torrent";

async function main(path: string): Promise<void> {
  const file = new TorrentFile(path);
  await file.readTorrentFile();

  const downloader = new Downloader(file);

  const tracker = new Tracker(downloader);
  await tracker.getPeersHttp();

  const peer = new Peer(tracker.peers[0], downloader);
  await peer.download();
}

const filePath = path.join(magnetFilesPath, magnetFileName);
main(filePath);
