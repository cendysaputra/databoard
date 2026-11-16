/** Hands a file made in the app to the user as a download. */
export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/** Downloads text as a file of the given media type, e.g. `application/json`. */
export function downloadText(text: string, name: string, type: string): void {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), name);
}
