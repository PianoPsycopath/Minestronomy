const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c >>> 0;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

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
    const cleanPath = path.replace(/^\/+/, "");
    const nameBytes = this.encoder.encode(cleanPath);
    const data = uint8Array instanceof Uint8Array ? uint8Array : new Uint8Array(uint8Array);
    this.files.push({
      nameBytes,
      data,
      crc: crc32(data)
    });
  }

  buildBlob(mimeType = "application/octet-stream") {
    let offset = 0;
    const localParts = [];
    const centralParts = [];

    for (const file of this.files) {
      const nameLen = file.nameBytes.length;
      const dataLen = file.data.length;

      const localHeader = new Uint8Array(30 + nameLen);
      const lv = new DataView(localHeader.buffer);
      lv.setUint32(0, 0x04034b50, true);
      lv.setUint16(4, 20, true);
      lv.setUint16(6, 0x0800, true);
      lv.setUint16(8, 0, true);
      lv.setUint16(10, 0, true);
      lv.setUint16(12, 0x2100, true);
      lv.setUint32(14, file.crc, true);
      lv.setUint32(18, dataLen, true);
      lv.setUint32(22, dataLen, true);
      lv.setUint16(26, nameLen, true);
      lv.setUint16(28, 0, true);
      localHeader.set(file.nameBytes, 30);

      const centralHeader = new Uint8Array(46 + nameLen);
      const cv = new DataView(centralHeader.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, 0, true);
      cv.setUint16(14, 0x2100, true);
      cv.setUint32(16, file.crc, true);
      cv.setUint32(20, dataLen, true);
      cv.setUint32(24, dataLen, true);
      cv.setUint16(28, nameLen, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      centralHeader.set(file.nameBytes, 46);

      localParts.push(localHeader, file.data);
      centralParts.push(centralHeader);
      offset += localHeader.length + dataLen;
    }

    const centralSize = centralParts.reduce((acc, part) => acc + part.length, 0);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, this.files.length, true);
    ev.setUint16(10, this.files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    return new Blob([...localParts, ...centralParts, eocd], { type: mimeType });
  }
}