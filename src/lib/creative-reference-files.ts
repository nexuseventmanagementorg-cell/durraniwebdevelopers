const REFERENCE_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "video/mp4": ["mp4"],
  "video/webm": ["webm"],
  "text/plain": ["txt", "srt", "fountain"],
  "application/x-subrip": ["srt"],
  "application/pdf": ["pdf"],
  "application/msword": ["doc"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/rtf": ["rtf"],
  "text/rtf": ["rtf"],
  "application/x-rtf": ["rtf"],
};

function hasExpectedSignature(type: string, bytes: Uint8Array): boolean {
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/png") {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  }
  if (type === "image/webp") {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (type === "video/mp4") {
    return bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70;
  }
  if (type === "video/webm") {
    return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  }
  if (type === "application/pdf") {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  }
  if (type === "application/msword") {
    return bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 && bytes[5] === 0xb1 && bytes[6] === 0x1a && bytes[7] === 0xe1;
  }
  if (type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  }
  if (["application/rtf", "text/rtf", "application/x-rtf"].includes(type)) {
    return new TextDecoder().decode(bytes.subarray(0, 5)).startsWith("{\\rtf");
  }
  if (type === "text/plain" || type === "application/x-subrip") {
    try {
      return !bytes.includes(0) && new TextDecoder("utf-8", { fatal: true }).decode(bytes).trim().length > 0;
    } catch {
      return false;
    }
  }
  return false;
}

export function isValidCreativeReferenceFile(name: string, type: string, bytes: Uint8Array): boolean {
  const extension = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  return Boolean(REFERENCE_EXTENSIONS[type]?.includes(extension)) && hasExpectedSignature(type, bytes);
}
