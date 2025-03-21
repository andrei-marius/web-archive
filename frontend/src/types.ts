export interface Metadata {
  url: string;
  title: string;
  description: string;
  keywords: string;
  timestamp: string;
  screenshotBuffer: Buffer | Uint8Array;
  mhtmlContent: string | Uint8Array;
  screenshotPath: string;
  mhtmlPath: string;
  id: string;
}