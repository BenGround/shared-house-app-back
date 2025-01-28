export function getBufferImage(profilePicture: Buffer | ArrayBuffer | undefined): string | null {
  if (profilePicture) {
    let profilePictureBuffer = profilePicture;
    //TODO better condition
    if (!(profilePictureBuffer instanceof Buffer)) {
      profilePictureBuffer = Buffer.from(profilePictureBuffer as ArrayBuffer);
    }
    return `data:image/png;base64,${profilePictureBuffer.toString('base64')}`;
  } else {
    return null;
  }
}
