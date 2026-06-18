export interface ScannedPhoto {
  id: string;
  timestamp?: number;
  lat?: number;
  lng?: number;
}

export interface PhotoScannerPlugin {
  scan(options: { monthsBack?: number }): Promise<{ photos: ScannedPhoto[] }>;
  getFullImage(options: { id: string }): Promise<{ base64: string; mimeType: string }>;
}

export declare const PhotoScanner: PhotoScannerPlugin;
