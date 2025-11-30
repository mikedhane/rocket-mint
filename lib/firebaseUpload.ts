// lib/firebaseUpload.ts

/*async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);

  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function uploadImageToServer(file: File): Promise<string> {
  const dataBase64 = await fileToBase64(file);

  const payload = {
    mode: "image" as const,
    filename: file.name,
    contentType: file.type || "application/octet-stream",
    dataBase64,
  };

  const res = await fetch("/api/upload-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Image upload failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (!json.imageUrl) {
    throw new Error("API did not return imageUrl");
  }
  return json.imageUrl as string;
}

export async function uploadMetadataToServer(
  metadata: any,
  filename: string
): Promise<string> {
  const payload = {
    mode: "metadata" as const,
    filename,
    metadata,
  };

  const res = await fetch("/api/upload-metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Metadata upload failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (!json.metadataUrl) {
    throw new Error("API did not return metadataUrl");
  }
  return json.metadataUrl as string;
}
*/

// lib/firebaseUpload.ts

/**
 * Upload an image file to our /api/upload-metadata route.
 * The route expects JSON with { mode: "image", dataBase64, ... }.
 */
export async function uploadImageToServer(file: File): Promise<string> {
  // Read file → ArrayBuffer
  const arrayBuffer = await file.arrayBuffer();

  // Convert to base64 (browser-safe)
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const dataBase64 = btoa(binary);

  const res = await fetch("/api/upload-metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "image",
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      dataBase64,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Image upload failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (!json.imageUrl) {
    throw new Error("API did not return imageUrl");
  }

  return json.imageUrl as string;
}

/**
 * Upload metadata JSON to our /api/upload-metadata route.
 * The route expects JSON with { mode: "metadata", filename, metadata }.
 */
export async function uploadMetadataToServer(
  metadata: unknown,
  filename: string
): Promise<string> {
  const res = await fetch("/api/upload-metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      mode: "metadata",
      filename,
      metadata,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Metadata upload failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (!json.metadataUrl) {
    throw new Error("API did not return metadataUrl");
  }

  return json.metadataUrl as string;
}
