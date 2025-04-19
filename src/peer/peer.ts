import * as net from "net";
import { PeerInfoDto } from "../core/types/peers.dto";
import { Socket } from "net";
import { PeerMessageIdEnum } from "../core/types/peer-message-id.enum";
import { Downloader } from "../downloader/downloader";
import { Logger } from "../core/logger/logger";

export class Peer {
  peerId: string;
  peerInfo: PeerInfoDto;
  client: Socket;
  keepAlive: boolean;

  downloader: Downloader;

  logger: Logger;

  receivingPieceData: boolean;
  receivedData: Buffer[];
  receivedDataLength: number;
  receiveDataExpectedLength: number;
  currentPieceIndex: number;
  currentBlockIndex: number;

  constructor(peerInfo: PeerInfoDto, downloader: Downloader) {
    this.peerInfo = peerInfo;
    this.downloader = downloader;
    this.client = new net.Socket({});
    this.client.setTimeout(120000);
    this.keepAlive = true;

    this.receivingPieceData = false;
    this.receivedData = [];
    this.receivedDataLength = 0;
    this.receiveDataExpectedLength = 0;
    this.currentPieceIndex = 0;
    this.currentBlockIndex = 0;

    this.logger = new Logger(Peer.name);
  }

  async download(): Promise<void> {
    this.client.connect(this.peerInfo.port, this.peerInfo.ip);
    this.client.on("connect", () => {
      this.logger.log("connection has occured, sending handshake");
      this.client.write(this.downloader.handshakeMessage);
    });
    this.client.on("data", (data) => {
      this.processDataFromPeer(data);
    });
    this.client.on("error", (error) => {
      this.logger.log(`error: ${error}`);
      this.closeConnection();
    });
    this.client.on("close", (data) => {
      this.logger.log(`close, error: ${data}`);
      this.closeConnection();
    });
    this.client.on("timeout", () => {
      this.logger.log("timeout has occured");
      this.closeConnection();
    });
  }

  processDataFromPeer(data: Buffer): void {
    this.logReceivedData(data);
    if (this.receivingPieceData) {
      this.receivePieceData(data);
      return;
    }
    const messageLength = data.readUInt32BE();
    const messageType =
      messageLength > 0 ? data.readUInt8(4) : PeerMessageIdEnum.KEEP;
    if (!this.peerId) {
      this.decodePeerHandshakeMessage(data);
      this.sendBitfield();
      this.sendHave();
    }
    if (messageType === PeerMessageIdEnum.PIECE) {
      this.logger.debug("piece received");
      this.receivingPieceData = true;
      this.receivePieceMessage(data);
    }
    if (messageType === PeerMessageIdEnum.BITFIELD) {
      this.logger.log(`bitfield received from ${this.peerId}`);
      this.sendInterested();
    }
    if (messageType === PeerMessageIdEnum.UNCHOKE) {
      this.logger.log(`unchoke received from ${this.peerId}`);
      this.sendRequest();
    }
    if (messageType === PeerMessageIdEnum.KEEP) {
      this.sendKeepAlive();
    }
  }

  receivePieceMessage(data: Buffer): void {
    this.logger.debug("receiving peice message");
    const totalDataLength = data.length;
    const messageLength = data.readUInt32BE();
    const messageType = data.readUInt8(4);
    const pieceIndex = data.readUInt32BE(5);
    const blockBegin = data.readUInt32BE(9);

    const blockDataPart = data.subarray(13, totalDataLength);
    this.receivedData.push(blockDataPart);
    this.receivedDataLength += blockDataPart.length;
    this.logger.debug(`block length is ${blockDataPart.length}`);

    this.receiveDataExpectedLength = messageLength - (1 + 4 + 4);

    if (this.receivedDataLength === this.receiveDataExpectedLength) {
      this.saveBlock();
    }
  }

  receivePieceData(data: Buffer): void {
    this.logger.debug(`receiving piece data: ${data.length}`);
    this.receivedData.push(data);
    this.receivedDataLength += data.length;
    if (this.receivedDataLength === this.receiveDataExpectedLength) {
      this.saveBlock();
    }
  }

  saveBlock(): void {
    this.receivingPieceData = false;
    const receivedBlock = Buffer.concat(this.receivedData);
    this.logger.debug(`received block; block length: ${receivedBlock.length}`);
    this.logger.debug(
      `writing block: peice index = ${this.currentPieceIndex}, block index =  ${this.currentBlockIndex}, length = ${receivedBlock.length}`
    );
    this.downloader.writeBlock(
      receivedBlock,
      this.currentPieceIndex,
      this.currentBlockIndex
    );
    const nextUndoneBlock = this.downloader.getNextUndoneBlock(this.peerId);
    this.logger.debug(`next block is: ${JSON.stringify(nextUndoneBlock)}`);
    if (nextUndoneBlock) {
      this.receivedData = [];
      this.receivedDataLength = 0;
      this.receiveDataExpectedLength = nextUndoneBlock.length;
      this.currentPieceIndex = nextUndoneBlock.parent;
      this.currentBlockIndex = nextUndoneBlock.index;
      this.sendRequest();
    } else {
      this.closeConnection();
    }
  }

  sendInterested(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.INTERESTED, 4);
    this.logger.log(`sending interested to ${this.peerId}: ${message}`);
    this.client.write(message);
    this.keepAlive = true;
  }

  sendRequest(): void {
    const undoneBlock = this.downloader.getNextUndoneBlock(this.peerId);
    const message = Buffer.alloc(17);
    message.writeUInt32BE(13);
    message.writeUInt8(PeerMessageIdEnum.REQUEST, 4);
    message.writeUInt32BE(undoneBlock.parent, 5);
    message.writeUInt32BE(undoneBlock.begin, 9);
    message.writeUInt32BE(undoneBlock.length, 13);
    this.logger.debug(`sending request to ${this.peerId}`); // : ${message.toString("binary")}
    this.client.write(message);
    this.keepAlive = true;
  }

  sendHave(): void {
    const message = Buffer.alloc(9);
    message.writeUInt32BE(5);
    message.writeUInt8(PeerMessageIdEnum.HAVE, 4);
    message.writeUInt32BE(0, 5);
    this.logger.log(`sending have to ${this.peerId}: ${message}`);
    this.client.write(message);
  }

  sendKeepAlive(): void {
    const message = Buffer.alloc(4);
    message.writeUInt32BE(0);
    this.logger.log(`sending keep-alive to ${this.peerId}: ${message}`);
    this.client.write(message);
  }

  sendBitfield(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.BITFIELD, 4);
    this.logger.log(`sending bifield to ${this.peerId}: ${message}`);
    this.client.write(message);
  }

  logReceivedData(data: Buffer): void {
    this.logger.debug(`data: length = ${data.length}`);
  }

  closeConnection(): void {
    this.client.end();
    this.client.destroy();
  }

  decodePeerHandshakeMessage(peerMessage: Buffer): string {
    const firstByteLength = 1;
    const protocolStringLength = 19;
    const reservedBytesLength = 8;
    const infoHashLength = 20;
    const peerIdLength = 20;

    const lengthBeforeInfoHash =
      firstByteLength + protocolStringLength + reservedBytesLength;

    const lengthBeforePeerId = lengthBeforeInfoHash + infoHashLength;

    const peerId = Buffer.alloc(peerIdLength);
    peerMessage.copy(peerId, 0, lengthBeforePeerId, peerMessage.length);

    const infoHash = Buffer.alloc(infoHashLength);
    peerMessage.copy(infoHash, 0, lengthBeforeInfoHash, lengthBeforePeerId);

    const protocol = Buffer.alloc(protocolStringLength);
    peerMessage.copy(
      protocol,
      0,
      firstByteLength,
      protocolStringLength + firstByteLength
    );

    this.logger.debug(`peer message length is: ${peerMessage.length}`);
    this.logger.debug(`protocol: ${protocol.toString("binary")}`);
    this.logger.log(`peer id: ${peerId.toString("hex")}`);
    this.logger.log(`info hash from peer: ${infoHash.toString("hex")}`);

    this.peerId = peerId.toString("hex");
    return this.peerId;
  }
}
