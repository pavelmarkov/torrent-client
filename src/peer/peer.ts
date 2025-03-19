import * as net from 'net';
import { PeerInfoDto } from '../types/peers.dto';

export async function peerHandhake(
  peerInfo: PeerInfoDto,
  message: Buffer
): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(peerInfo.port, peerInfo.ip, () => {
      client.write(message);
    });
    client.on('data', (data) => {
      client.end();
      client.destroy();
      resolve(decodePeerHandshakeMessage(data));
    });
    client.on('error', (error) => {
      client.end();
      client.destroy();
      reject(error);
    });
  });
}

export function preparePeerHandshakeMessage(infoHash: string, peerId: string): Buffer {
  const protocolStringLength = Buffer.from([19]);
  const protocolString = Buffer.from("BitTorrent protocol");
  const reservedBytes = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
  const infoHashPart = Buffer.from(infoHash, 'hex');
  const peerIdPart = Buffer.from(peerId, 'hex');
  return Buffer.concat([
    protocolStringLength,
    protocolString,
    reservedBytes,
    infoHashPart,
    peerIdPart,
  ]);
}

function decodePeerHandshakeMessage(peerMessage: Buffer): string {
  const firstByteLength = 1;
  const protocolStringLength = 19;
  const reservedBytesLength = 8;
  const infoHashLength = 20;
  const lengthBeforePeerId = firstByteLength + protocolStringLength
    + reservedBytesLength + infoHashLength;

  const peerId = Buffer.alloc(20);
  peerMessage.copy(peerId, 0, lengthBeforePeerId, peerMessage.length);

  return peerId.toString('hex');
}
