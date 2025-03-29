import * as net from 'net';
import { PeerInfoDto } from '../types/peers.dto';
import { Socket } from 'net';
import { PeerMessageIdEnum } from '../types/peer-message-id.enum';
import { Downloader } from '../downloader/downloader';

export class Peer {
  clientId: string;
  peerId: string;
  peerInfo: PeerInfoDto;
  client: Socket;
  keepAlive: boolean;
  infoHash: string;
  constructor(peerInfo: PeerInfoDto, downloader: Downloader,) {
    this.peerInfo = peerInfo;
    this.clientId = downloader.clientPeerId;
    this.infoHash = downloader.infoHash;
    this.client = new net.Socket({});
    this.client.setTimeout(120000);
    this.keepAlive = true;
  }

  async download(
    downloader: Downloader,
  ): Promise<void> {
    this.client.connect(this.peerInfo.port, this.peerInfo.ip);
    this.client.on('connect', () => {
      console.log('connection has occured');
      const handshakeMessage = this.preparePeerHandshakeMessage();
      this.client.write(handshakeMessage);
    });
    this.client.on('data', (data) => {
      this.logReceivedData(data);
      const messageLength = data.readUInt32BE();
      const messageType = messageLength > 0 ? data.readUInt8(4) : PeerMessageIdEnum.keep;
      if (!this.peerId) {
        this.peerId = decodePeerHandshakeMessage(data);
        this.sendBitfield();
        this.sendHave();
      }
      if (messageType === PeerMessageIdEnum.bitfield) {
        console.log('bitfield received');
        this.sendInterested();
      }
      if (messageType === PeerMessageIdEnum.unchoke) {
        console.log('unchoke received');
        this.sendRequest(downloader);
      }
      if (messageType === PeerMessageIdEnum.piece) {
        console.log('piece received');
      }
      if (messageType === PeerMessageIdEnum.keep) {
        this.sendKeepAlive();
      }
    });
    this.client.on('error', (error) => {
      console.log('error: ', error);
      this.closeConnection();
    });
    this.client.on('close', (data) => {
      console.log('close, error:', data);
      this.closeConnection();
    });
    this.client.on('timeout', () => {
      console.log('timeout has occured');
      this.closeConnection();
    });
  }

  sendInterested(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.interested, 4);
    console.log(`sending interested to ${this.peerId}: `, message);
    this.client.write(message);
    this.keepAlive = true;
  };

  sendRequest(downloader: Downloader): void {
    const message = Buffer.alloc(17);
    message.writeUInt32BE(13);
    message.writeUInt8(PeerMessageIdEnum.request, 4);
    message.writeUInt32BE(downloader.parts[0].index, 5);
    message.writeUInt32BE(downloader.parts[0].blocks[0].begin, 9);
    message.writeUInt32BE(downloader.parts[0].blocks[0].length, 13);
    console.log(`sending request to ${this.peerId}: `, message);
    this.client.write(message);
    this.keepAlive = true;
  };

  sendHave(): void {
    const message = Buffer.alloc(9);
    message.writeUInt32BE(5);
    message.writeUInt8(PeerMessageIdEnum.have, 4);
    message.writeUInt32BE(0, 5);
    console.log(`sending have to ${this.peerId}: `, message);
    this.client.write(message);
  };

  sendKeepAlive(): void {
    const message = Buffer.alloc(4);
    message.writeUInt32BE(0);
    console.log(`sending keep-alive to ${this.peerId}: `, message);
    this.client.write(message);
  };

  sendBitfield(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.bitfield, 4);
    console.log(`sending bifield to ${this.peerId}: `, message);
    this.client.write(message);
  };

  logReceivedData(data: Buffer): void {
    let now = new Date().toISOString().substring(11, 19);
    console.log(`[${now}] data:`, data);
  };

  closeConnection(): void {
    this.client.end();
    this.client.destroy();
  }

  preparePeerHandshakeMessage(): Buffer {
    const protocolStringLength = Buffer.from([19]);
    const protocolString = Buffer.from("BitTorrent protocol");
    const reservedBytes = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
    const infoHashPart = Buffer.from(this.infoHash, 'hex');
    console.log('encoded info hash: ', infoHashPart.toString('hex'));
    const peerIdPart = Buffer.from(this.clientId, 'hex');
    return Buffer.concat([
      protocolStringLength,
      protocolString,
      reservedBytes,
      infoHashPart,
      peerIdPart,
    ]);
  }
}

function decodePeerHandshakeMessage(peerMessage: Buffer): string {

  const firstByteLength = 1;
  const protocolStringLength = 19;
  const reservedBytesLength = 8;
  const infoHashLength = 20;
  const peerIdLength = 20;

  const lengthBeforeInfoHash = firstByteLength + protocolStringLength
    + reservedBytesLength;

  const lengthBeforePeerId = lengthBeforeInfoHash + infoHashLength;

  const peerId = Buffer.alloc(peerIdLength);
  peerMessage.copy(peerId, 0, lengthBeforePeerId, peerMessage.length);

  const infoHash = Buffer.alloc(infoHashLength);
  peerMessage.copy(infoHash, 0, lengthBeforeInfoHash, lengthBeforePeerId);

  const protocol = Buffer.alloc(protocolStringLength);
  peerMessage.copy(protocol, 0, firstByteLength, protocolStringLength + firstByteLength);

  console.log('peer message length is: ', peerMessage.length);
  console.log('protocol: ', protocol.toString('binary'));
  console.log('info hash: ', infoHash.toString('hex'));
  console.log('peer id: ', peerId.toString('hex'));

  return peerId.toString('hex');
}
