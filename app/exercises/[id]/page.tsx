import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PHOTO_NUMBERS } from "../photo-rules";

export const metadata: Metadata = {
  title: "運動の詳しいページ｜リハビリ運動ノート",
};

type ExerciseDetail = {
  id: string;
  name: string;
  duration_minutes: number;
  instructions: string | null;
  target_muscles: string | null;
  compensation_muscles: string | null;
  exercise_photos: { path: string; caption: string; position: number }[];
};

// 写真を見られる期限つきURLの有効時間（秒）
const PHOTO_URL_EXPIRES_IN = 60 * 60;

// 運動の id は uuid の形。ちがう形なら問い合わせずに「見つかりません」にする
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function BackLink() {
  return (
    <Link href="/" className="text-teal-700 underline">
      ← 一覧へ戻る
    </Link>
  );
}

export default function ExercisePage({
  params,
}: PageProps<"/exercises/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 text-lg">
      <BackLink />
      <Suspense fallback={<p>読み込み中…</p>}>
        {params.then(({ id }) => (
          <ExerciseContent id={id} />
        ))}
      </Suspense>
      <BackLink />
    </main>
  );
}

async function ExerciseContent({ id }: { id: string }) {
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 自分以外の運動は、Supabase のルールでデータが返ってこない（＝見つからない）
  const { data: exercise, error } = await supabase
    .from("exercises")
    .select(
      "id, name, duration_minutes, instructions, target_muscles, compensation_muscles, exercise_photos(path, caption, position)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "exercise_photos" })
    .maybeSingle<ExerciseDetail>();

  if (error) {
    return (
      <p role="alert" className="text-red-600">
        運動を読み込めませんでした。ページを開きなおしてください
      </p>
    );
  }
  if (!exercise) {
    notFound();
  }

  // 写真は非公開なので、本人用の期限つきURLをまとめて発行する
  const photos = exercise.exercise_photos;
  const photoUrls = new Map<string, string>();
  if (photos.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("exercise-photos")
      .createSignedUrls(
        photos.map((photo) => photo.path),
        PHOTO_URL_EXPIRES_IN,
      );
    signedUrls?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) {
        photoUrls.set(path, signedUrl);
      }
    });
  }

  return (
    <article className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold break-words">{exercise.name}</h1>
        <p className="text-zinc-600">所要時間：{exercise.duration_minutes}分</p>
      </header>

      {photos.length === 0 ? (
        <p className="rounded-2xl bg-zinc-100 px-4 py-8 text-center text-zinc-500">
          写真はありません
        </p>
      ) : (
        <ol className="flex flex-col gap-8">
          {photos.map((photo, index) => {
            const photoUrl = photoUrls.get(photo.path);
            return (
              <li key={photo.path} className="flex flex-col gap-2">
                <span className="text-2xl font-bold">
                  {PHOTO_NUMBERS[index]}
                </span>
                {/* 写真ごとに縦横の形がちがうので、切らずに元の形のまま画面幅いっぱいに出す */}
                <div className="-mx-4">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- ログインが必要な写真で、形も決まっていないので next/image は使わない
                    <img
                      src={photoUrl}
                      alt={`${exercise.name}の写真${PHOTO_NUMBERS[index]}`}
                      className="h-auto w-full"
                    />
                  ) : (
                    <p className="bg-zinc-100 px-4 py-8 text-center text-zinc-500">
                      写真を読み込めませんでした
                    </p>
                  )}
                </div>
                {photo.caption && (
                  <p className="whitespace-pre-wrap break-words">
                    {photo.caption}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <dl className="flex flex-col gap-6">
        <DetailItem label="やり方" value={exercise.instructions} />
        <DetailItem label="意識する筋肉" value={exercise.target_muscles} />
        <DetailItem
          label="代償しやすい筋肉"
          value={exercise.compensation_muscles}
        />
      </dl>
    </article>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xl font-bold">{label}</dt>
      <dd className="whitespace-pre-wrap break-words">
        {value?.trim() ? value : <span className="text-zinc-500">（未入力）</span>}
      </dd>
    </div>
  );
}
