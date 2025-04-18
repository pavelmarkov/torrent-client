import { URL } from "url";
import { get, IncomingMessage, RequestOptions } from "node:http";
import {
  GetPeersDecodedResponseDto,
  GetPeersRequestDto,
  PeerInfoDto,
} from "../core/types/peers.dto";
import { Parser } from "../bencode/parser";
import { Downloader } from "../downloader/downloader";
import { Logger } from "../core/logger/logger";

export class Tracker {
  downloader: Downloader;
  peers: PeerInfoDto[];

  logger: Logger;

  constructor(downloader: Downloader) {
    this.downloader = downloader;

    this.logger = new Logger(Tracker.name);
  }

  async getPeersHttp(): Promise<GetPeersDecodedResponseDto> {
    const requestPeersParams: GetPeersRequestDto = {
      info_hash: this.downloader.infoHash,
      peer_id: this.downloader.clientPeerId,
      port: null,
      uploaded: this.downloader.uploaded,
      downloaded: this.downloader.downloaded,
      left: this.downloader.left,
      compact: 1,
    };

    const announceUrl = new URL(this.downloader.trackerUrl);
    const encodedHash = urlEncodeHash(requestPeersParams.info_hash);
    const announceUrlPort = announceUrl.port ? announceUrl.port : "6881";

    const params: GetPeersRequestDto = {
      info_hash: encodedHash,
      peer_id: requestPeersParams.peer_id,
      port: announceUrlPort,
      uploaded: requestPeersParams.uploaded,
      downloaded: requestPeersParams.downloaded,
      left: requestPeersParams.left,
      compact: requestPeersParams.compact,
    };

    const queryParamString = Object.entries(params)
      .map(([key, value], index) => `${key}=${value}`)
      .join("&");

    const requestOptions: RequestOptions = {
      hostname: `${announceUrl.hostname}`,
      path: `${announceUrl.pathname}?${queryParamString}`,
      agent: false,
    };

    return new Promise((resolve, reject) => {
      get(requestOptions, (response: IncomingMessage) => {
        const data: Buffer[] = [];

        response.on("data", (chunk) => {
          data.push(chunk);
        });

        response.on("end", () => {
          const receivedData = Buffer.concat(data);
          const decodedPeers = decodePeersResponse(receivedData);
          this.peers = decodedPeers?.peers;
          this.logger.log(`number of peers: ${this.peers.length}`);
          resolve(decodedPeers);
        });

        response.on("error", (error) => {
          reject(error);
        });
      });
    });
  }
}

function urlEncodeHash(hash: string): string {
  const hashArray = Array.from(hash);
  const encodedHashArray = [];
  for (let index = 0; index < hashArray.length - 1; index++) {
    if (index % 2 === 0) {
      const element = `%${hashArray[index]}${hashArray[index + 1]}`;
      encodedHashArray.push(element);
    }
  }
  const encodedHash = encodedHashArray.join("");
  return encodedHash;
}

function decodePeersResponse(
  peersResponse: Buffer
): GetPeersDecodedResponseDto {
  const parser = new Parser();
  const responseData = parser.parse(
    Buffer.from(peersResponse).toString("binary")
  );
  const result: GetPeersDecodedResponseDto = {
    interval: responseData.data["interval"],
    "min interval": responseData.data["min interval"],
    peers: [],
    complete: responseData.data["complete"],
    incomplete: responseData.data["incomplete"],
  };

  const peersBuffer = Buffer.from(responseData["data"]["peers"], "binary");
  const numPeers = Math.floor(peersBuffer.length / 6);
  const peerList: PeerInfoDto[] = [];

  for (let peerNum = 0; peerNum < numPeers; peerNum++) {
    const shift = peerNum * 6;
    const ip = `${peersBuffer[shift]}.${peersBuffer[shift + 1]}.${
      peersBuffer[shift + 2]
    }.${peersBuffer[shift + 3]}`;
    const port = peersBuffer.readUInt16BE(shift + 4);
    peerList.push({ ip, port });
  }
  result.peers = peerList;

  return result;
}
