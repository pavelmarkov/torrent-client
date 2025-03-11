import { URL } from 'url';
import { get, IncomingMessage } from 'node:http';
import { GetPeersRequestDto } from '../types/peers.dto';

export async function getPeersHttp(url: string, requestPeersParams: GetPeersRequestDto): Promise<string> {

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
        resolve(data);
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