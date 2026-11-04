import Image from "next/image";

// トップの写真（なければ「写真なし」）を正方形で出す。一覧と今日のセットで使う
export function TilePhoto({
  photoUrl,
  alt,
  sizes,
}: {
  photoUrl: string | null;
  alt: string;
  sizes: string;
}) {
  return (
    <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 text-note text-zinc-500">
      {photoUrl ? (
        // ログインが必要な写真なので、Next.js の画像変換は使わない
        <Image
          src={photoUrl}
          alt={alt}
          fill
          unoptimized
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        "写真なし"
      )}
    </div>
  );
}
