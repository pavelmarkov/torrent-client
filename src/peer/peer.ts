import * as net from "net";
import { PeerInfoDto } from "../types/peers.dto";
import { Socket } from "net";
import { PeerMessageIdEnum } from "../types/peer-message-id.enum";
import { Downloader } from "../downloader/downloader";

export class Peer {
  peerId: string;
  peerInfo: PeerInfoDto;
  client: Socket;
  keepAlive: boolean;

  downloader: Downloader;

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
  }

  async download(): Promise<void> {
    this.client.connect(this.peerInfo.port, this.peerInfo.ip);
    this.client.on("connect", () => {
      console.log("connection has occured");
      const handshakeMessage = this.preparePeerHandshakeMessage();
      this.client.write(handshakeMessage);
    });
    this.client.on("data", (data) => {
      this.processDataFromPeer(data);
    });
    this.client.on("error", (error) => {
      console.log("error: ", error);
      this.closeConnection();
    });
    this.client.on("close", (data) => {
      console.log("close, error:", data);
      this.closeConnection();
    });
    this.client.on("timeout", () => {
      console.log("timeout has occured");
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
      this.peerId = decodePeerHandshakeMessage(data);
      this.sendBitfield();
      this.sendHave();
    }
    if (messageType === PeerMessageIdEnum.PIECE) {
      console.log("piece received");
      this.receivingPieceData = true;
      this.receivePieceMessage(data);
    }
    if (messageType === PeerMessageIdEnum.BITFIELD) {
      console.log("bitfield received");
      this.sendInterested();
    }
    if (messageType === PeerMessageIdEnum.UNCHOKE) {
      console.log("unchoke received");
      this.sendRequest();
    }
    if (messageType === PeerMessageIdEnum.KEEP) {
      this.sendKeepAlive();
    }
  }

  receivePieceMessage(data: Buffer): void {
    console.log("receiving peice message");
    const totalDataLength = data.length;
    const messageLength = data.readUInt32BE();
    const messageType = data.readUInt8(4);
    const pieceIndex = data.readUInt32BE(5);
    const blockBegin = data.readUInt32BE(9);

    const blockDataPart = data.subarray(13, totalDataLength);
    this.receivedData.push(blockDataPart);
    this.receivedDataLength += blockDataPart.length;
    console.log("block length is ", blockDataPart.length);

    this.receiveDataExpectedLength = messageLength - (1 + 4 + 4);

    if (this.receivedDataLength === this.receiveDataExpectedLength) {
      this.saveBlock();
    }
  }

  receivePieceData(data: Buffer): void {
    console.log("receiving piece data: ", data.length);
    this.receivedData.push(data);
    this.receivedDataLength += data.length;
    if (this.receivedDataLength === this.receiveDataExpectedLength) {
      this.saveBlock();
    }
  }

  saveBlock(): void {
    this.receivingPieceData = false;
    const receivedBlock = Buffer.concat(this.receivedData);
    console.log("received piece block");
    console.log("received block length is ", receivedBlock.length);
    console.log(
      "writing block: ",
      this.currentPieceIndex,
      this.currentBlockIndex
    );
    this.downloader.writeBlock(
      receivedBlock,
      this.currentPieceIndex,
      this.currentBlockIndex
    );
    const nextUndoneBlock = this.downloader.getNextUndoneBlock(this.peerId);
    console.log("next block is: ", nextUndoneBlock);
    if (nextUndoneBlock) {
      this.receivedData = [];
      this.receivedDataLength = 0;
      this.receiveDataExpectedLength = nextUndoneBlock.length;
      this.currentPieceIndex = nextUndoneBlock.parent;
      this.currentBlockIndex = nextUndoneBlock.index;
      setTimeout(() => {
        this.sendRequest();
      }, 1000);
    } else {
      this.downloader.saveFile();
      this.closeConnection();
    }
  }

  sendInterested(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.INTERESTED, 4);
    console.log(`sending interested to ${this.peerId}: `, message);
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
    console.log(`sending request to ${this.peerId}: `, message);
    this.client.write(message);
    this.keepAlive = true;
  }

  sendHave(): void {
    const message = Buffer.alloc(9);
    message.writeUInt32BE(5);
    message.writeUInt8(PeerMessageIdEnum.HAVE, 4);
    message.writeUInt32BE(0, 5);
    console.log(`sending have to ${this.peerId}: `, message);
    this.client.write(message);
  }

  sendKeepAlive(): void {
    const message = Buffer.alloc(4);
    message.writeUInt32BE(0);
    console.log(`sending keep-alive to ${this.peerId}: `, message);
    this.client.write(message);
  }

  sendBitfield(): void {
    const message = Buffer.alloc(5);
    message.writeUInt32BE(1);
    message.writeUInt8(PeerMessageIdEnum.BITFIELD, 4);
    console.log(`sending bifield to ${this.peerId}: `, message);
    this.client.write(message);
  }

  logReceivedData(data: Buffer): void {
    let now = new Date().toISOString().substring(11, 19);
    console.log(`[${now}] data:`, data);
  }

  closeConnection(): void {
    this.client.end();
    this.client.destroy();
  }

  preparePeerHandshakeMessage(): Buffer {
    const protocolStringLength = Buffer.from([19]);
    const protocolString = Buffer.from("BitTorrent protocol");
    const reservedBytes = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]);
    const infoHashPart = Buffer.from(this.downloader.infoHash, "hex");
    console.log("encoded info hash: ", infoHashPart.toString("hex"));
    const peerIdPart = Buffer.from(this.downloader.clientPeerId, "hex");
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

  console.log("peer message length is: ", peerMessage.length);
  console.log("protocol: ", protocol.toString("binary"));
  console.log("info hash: ", infoHash.toString("hex"));
  console.log("peer id: ", peerId.toString("hex"));

  return peerId.toString("hex");
}
