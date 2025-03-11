export class GetPeersRequestDto {
  info_hash: string;
  peer_id: string;
  port: string | number;
  uploaded: number;
  downloaded: number;
  left: number;
  compact: number;
}