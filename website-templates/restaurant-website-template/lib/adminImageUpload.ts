const MAX_ADMIN_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

export function isValidAdminImageDataUrl(image: string): boolean {
  const imageMatch = image.match(
    /^data:image\/(?:jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/
  );
  return Boolean(
    imageMatch &&
      Buffer.from(imageMatch[1], 'base64').byteLength <= MAX_ADMIN_IMAGE_SIZE_BYTES
  );
}
