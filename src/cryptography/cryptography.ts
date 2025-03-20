import * as crypto from 'crypto';

export function createInfoHash(bencodedInfoString: string): string {
  const sha1 = crypto.createHash('sha1');
  sha1.update(Buffer.from(bencodedInfoString, 'binary'));
  const hash = sha1.digest('hex');
  return hash;
}

export function generateRandomPeerId() {
  const peerId = crypto.randomBytes(10).toString('hex');
  return peerId;
}
