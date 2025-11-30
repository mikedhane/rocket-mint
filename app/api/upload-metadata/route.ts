// app/api/upload-metadata/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getBucket } from "@/lib/firebaseAdmin";
import { randomUUID } from "crypto";

type ImagePayload = {
  mode: "image";
  filename?: string;
  contentType?: string;
  dataBase64: string;
};

type MetadataPayload = {
  mode: "metadata";
  filename: string;
  metadata: any;
};

type Payload = ImagePayload | MetadataPayload;

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Payload;

    if (!body || typeof body !== "object" || !("mode" in body)) {
      return NextResponse.json(
        { error: "Invalid payload: missing mode" },
        { status: 400 }
      );
    }

    let imageUrl: string | null = null;
    let metadataUrl: string | null = null;

    // 🖼 IMAGE UPLOAD
    if (body.mode === "image") {
      const { dataBase64 } = body;
      let { filename, contentType } = body;

      if (!dataBase64) {
        return NextResponse.json(
          { error: "Missing dataBase64 for image upload" },
          { status: 400 }
        );
      }

      // Default filename / contentType
      filename = filename || `image-${randomUUID()}.png`;
      contentType = contentType || "application/octet-stream";

      // Sanitize filename
      filename = filename.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
      if (!filename.includes(".")) {
        filename = `${filename}.png`;
      }
      if (filename.startsWith("-")) {
        filename = `file${filename}`;
      }

      const imagePath = `memecoins/images/${filename}`;
      const bucket = getBucket();
      const file = bucket.file(imagePath);

      const buffer = Buffer.from(dataBase64, "base64");

      await file.save(buffer, {
        resumable: false,
        contentType,
        metadata: {
          cacheControl: "public,max-age=31536000",
        },
      });

      imageUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
        encodeURIComponent(imagePath) +
        `?alt=media`;
    }

    // 📄 METADATA UPLOAD
    if (body.mode === "metadata") {
      let { filename, metadata } = body;

      if (!filename) {
        filename = `metadata-${randomUUID()}.json`;
      }
      filename = filename.replace(/[^a-z0-9.\-_]/gi, "-").toLowerCase();
      if (!filename.endsWith(".json")) {
        filename = `${filename}.json`;
      }

      const jsonPath = `memecoins/metadata/${filename}`;
      const bucket = getBucket();
      const jsonFile = bucket.file(jsonPath);

      const jsonString =
        typeof metadata === "string"
          ? metadata
          : JSON.stringify(metadata ?? {}, null, 2);

      await jsonFile.save(jsonString, {
        resumable: false,
        contentType: "application/json",
      });

      metadataUrl =
        `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/` +
        encodeURIComponent(jsonPath) +
        `?alt=media`;
    }

    if (!imageUrl && !metadataUrl) {
      return NextResponse.json(
        { error: "Nothing to upload (no image or metadata)" },
        { status: 400 }
      );
    }

    return NextResponse.json({ imageUrl, metadataUrl });
  } catch (e: any) {
    console.error("Upload API error:", e);
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
