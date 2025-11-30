// app/dash/page.tsx
import { getDb } from "@/lib/firebaseAdmin";
import DashboardClient, { LaunchDoc } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getDb();
  const snap = await db
    .collection("launches")
    .orderBy("createdAt", "desc")
    .limit(100) // load up to 100 most recent launches
    .get();

  const launches: LaunchDoc[] = snap.docs.map((doc) => {
    const data = doc.data() as any;

    return {
      id: doc.id,
      name: data.name,
      symbol: data.symbol,
      description: data.description ?? "",
      imageUrl: data.imageUrl ?? data.imageURL ?? null,
      metadataUrl: data.metadataUrl ?? null,
      mintAddress: data.mintAddress,
      network: data.network ?? "devnet",
      platformFeeBps: data.platformFeeBps ?? null,
      creatorFeeBps: data.creatorFeeBps ?? null,
      mintSignature: data.mintSignature ?? null,
      metadataSignature: data.metadataSignature ?? null,
      creatorTreasury: data.creatorTreasury ?? null,
      createdAt: data.createdAt ?? "",
    };
  });

  return <DashboardClient initialLaunches={launches} />;
}
