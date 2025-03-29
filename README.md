# torrent-client

### `.torrent` file structure
- `announce`
- `announce-list`
- `creation date`
- `comment`
- `created by`
- `encoding`
- `info`

#### Info part
- `length`
- `piece length`
- `name`
- `pieces`

### Torrent tracker protocol
#### Getting peers
[Tracker Request Parameters](https://wiki.theory.org/BitTorrentSpecification#Tracker_Request_Parameters):
- `info_hash`: escaped (url encoded) 20 byte sha1 hash of the bencoded form of the info value from the metainfo file
- `peer_id`: client's peer id
- `port`: client's port
- `uploaded`: the total amount uploaded so far
- `downloaded`: the total amount downloaded so far
- `left`: the number of bytes this peer still has to download
- `compact`: 1 indicates that the client accepts a compact response

[Tracker Response](https://wiki.theory.org/BitTorrentSpecification#Tracker_Response):
- `peers` (binary model): String consisting of multiples of 6 bytes. First 4 bytes are the IP address and last 2 bytes are the port number. All in network (big endian) notation.
- `peers` (dictionary model):
  - `peer id`: peer's ID
  - `ip`: peer's ID
  - `port`: peer's ID

Using node.js, a peers binary model could be decoded into peers dictionary model through these steps:
1. `const peersBencodedString = Buffer.from(peersResponse).toString('binary')`
2. `const peersDictionaryModel = bencodeStringToArray(peersBencodedString)`

### Peer messaging
#### Message exchange order for downloading a file piece:
1. `handshake`
2. Sending `bitfield` message
3. Sendig `have` message
4. Receiving `bitfield` from a peer
5. Senging `interested` message
6. Receiving `unchoke` message
7. Sending `request` message
8. Receiving `piece` message


### Links
- [BitTorrent Protocol](https://www.bittorrent.org/beps/bep_0003.html)
- [Bittorrent Protocol Specification v1.0](https://wiki.theory.org/BitTorrentSpecification)
- [Bencode](https://en.wikipedia.org/wiki/Bencode)
- [UDP tracker protocol](https://bittorrent.org/beps/bep_0015.html)