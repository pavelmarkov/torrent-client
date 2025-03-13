import { URL } from 'url';
import { get, IncomingMessage } from 'node:http';
import { GetPeersDecodedResponseDto, GetPeersRequestDto, PeerInfoDto } from '../types/peers.dto';
import { Parser } from '../bencode/parser';

export async function getPeersHttp(url: string, requestPeersParams: GetPeersRequestDto): Promise<GetPeersDecodedResponseDto> {

  const announceUrl = new URL(url);
  const encodedHash = urlEncodeHash(requestPeersParams.info_hash);
  const announceUrlPort = announceUrl.port ? announceUrl.port : '6881';

  const params: GetPeersRequestDto = {
    info_hash: encodedHash,
    peer_id: requestPeersParams.peer_id,
    port: announceUrlPort,
    uploaded: requestPeersParams.uploaded,
    downloaded: requestPeersParams.downloaded,
    left: requestPeersParams.left,
    compact: requestPeersParams.compact,
  };

  const queryParamString = Object.entries(params).map(
    ([key, value], index) => `${key}=${value}`
  ).join('&');


  return new Promise((resolve, reject) => {
    get({
      hostname: `${announceUrl.hostname}`,
      path: `${announceUrl.pathname}?${queryParamString}`,
      agent: false
    }, (response: IncomingMessage) => {

      let data = '';

      response.on('data', (chunk) => {
        data += chunk.toString();
      });

      response.on('end', () => {
        const peers = decodePeersResponse(data);
        resolve(peers);
      });

      response.on('error', (error) => {
        reject(error);
      });
    });
  });
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
  const encodedHash = encodedHashArray.join('');
  return encodedHash;
}

function decodePeersResponse(peersResponse: string): GetPeersDecodedResponseDto {
  const parser = new Parser();
  const responseData = parser.parse(peersResponse);

  const result: GetPeersDecodedResponseDto = {
    interval: responseData.data['interval'],
    'min interval': responseData.data['min interval'],
    peers: [],
    complete: responseData.data['complete'],
    incomplete: responseData.data['incomplete'],
  };

  const peersBuffer = Buffer.from(responseData['data']['peers'], 'binary');
  const numPeers = Math.floor(peersBuffer.length / 6);
  const peerList: PeerInfoDto[] = [];
  for (let peerNum = 0; peerNum < numPeers; peerNum++) {
    const shift = peerNum * 6;
    const ip = `${peersBuffer[shift]}.${peersBuffer[shift + 1]}.${peersBuffer[shift + 2]}.${peersBuffer[shift + 3]}`;
    const port = peersBuffer.readUInt16BE(shift + 4);
    peerList.push({ ip, port });
  }
  result.peers = peerList;

  return result;
}