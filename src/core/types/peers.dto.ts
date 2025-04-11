export class GetPeersRequestDto {
  info_hash: string;
  peer_id: string;
  port: string | number;
  uploaded: number;
  downloaded: number;
  left: number;
  compact: number;
}

export class GetPeersDecodedResponseDto {
  interval: number;
  'min interval': number;
  peers: PeerInfoDto[];
  complete: number;
  incomplete: number;
}

export class PeerInfoDto {
  ip: string;
  port: number;
}
