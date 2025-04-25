let connectedPeers: string[] = [];

export function setConnectedPeers(peers: string[]) {
  connectedPeers = peers;
}

export function getConnectedPeers(): string[] {
  return connectedPeers;
}