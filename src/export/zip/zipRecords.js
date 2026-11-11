const UTF8_NAMES = 0x0800;
const NO_COMPRESSION = 0;
// DOS date 1980-01-01. The archive has no real file dates.
const DOS_DATE = 0x2100;

export function buildLocalHeader(file) {
  const nameLen = file.nameBytes.length;
  const dataLen = file.data.length;
  const header = new Uint8Array(30 + nameLen);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, 20, true);
  v.setUint16(6, UTF8_NAMES, true);
  v.setUint16(8, NO_COMPRESSION, true);
  v.setUint16(10, 0, true);
  v.setUint16(12, DOS_DATE, true);
  v.setUint32(14, file.crc, true);
  v.setUint32(18, dataLen, true);
  v.setUint32(22, dataLen, true);
  v.setUint16(26, nameLen, true);
  v.setUint16(28, 0, true);
  header.set(file.nameBytes, 30);
  return header;
}

export function buildCentralHeader(file, localOffset) {
  const nameLen = file.nameBytes.length;
  const dataLen = file.data.length;
  const header = new Uint8Array(46 + nameLen);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, 20, true);
  v.setUint16(6, 20, true);
  v.setUint16(8, UTF8_NAMES, true);
  v.setUint16(10, NO_COMPRESSION, true);
  v.setUint16(12, 0, true);
  v.setUint16(14, DOS_DATE, true);
  v.setUint32(16, file.crc, true);
  v.setUint32(20, dataLen, true);
  v.setUint32(24, dataLen, true);
  v.setUint16(28, nameLen, true);
  v.setUint16(30, 0, true);
  v.setUint16(32, 0, true);
  v.setUint16(34, 0, true);
  v.setUint16(36, 0, true);
  v.setUint32(38, 0, true);
  v.setUint32(42, localOffset, true);
  header.set(file.nameBytes, 46);
  return header;
}

export function buildEndRecord(fileCount, centralSize, centralOffset) {
  const record = new Uint8Array(22);
  const v = new DataView(record.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(4, 0, true);
  v.setUint16(6, 0, true);
  v.setUint16(8, fileCount, true);
  v.setUint16(10, fileCount, true);
  v.setUint32(12, centralSize, true);
  v.setUint32(16, centralOffset, true);
  v.setUint16(20, 0, true);
  return record;
}
