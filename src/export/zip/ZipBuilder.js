import { crc32 } from "./crc32.js";
import { buildLocalHeader, buildCentralHeader, buildEndRecord } from "./zipRecords.js";

export class ZipBuilder {
  constructor() {
    this.files = [];
    this.encoder = new TextEncoder();
  }

  addText(path, textContent) {
    this.addBytes(path, this.encoder.encode(textContent));
  }

  addJson(path, obj) {
    this.addText(path, JSON.stringify(obj, null, 2));
  }

  addBytes(path, uint8Array) {
    const nameBytes = this.encoder.encode(path.replace(/^\/+/, ""));
    const data = uint8Array instanceof Uint8Array ? uint8Array : new Uint8Array(uint8Array);
    this.files.push({ nameBytes, data, crc: crc32(data) });
  }

  buildBlob(mimeType = "application/octet-stream") {
    let offset = 0;
    const localParts = [];
    const centralParts = [];

    for (const file of this.files) {
      const local = buildLocalHeader(file);
      centralParts.push(buildCentralHeader(file, offset));
      localParts.push(local, file.data);
      offset += local.length + file.data.length;
    }

    const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
    const end = buildEndRecord(this.files.length, centralSize, offset);
    return new Blob([...localParts, ...centralParts, end], { type: mimeType });
  }
}
