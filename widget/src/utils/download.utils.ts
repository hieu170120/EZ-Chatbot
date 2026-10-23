/**
 * Safely downloads an image from a Blob URL or remote URL.
 * Automatically cleans up Object URLs and falls back to window.open on CORS failure.
 */
export const downloadImage = async (
  url: string,
  defaultFilename = "attachment.png",
): Promise<void> => {
  try {
    if (url.startsWith("blob:")) {
      const a = document.createElement("a");
      a.href = url;
      a.download = defaultFilename;
      a.click();
      return;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image blob");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = defaultFilename;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
};
