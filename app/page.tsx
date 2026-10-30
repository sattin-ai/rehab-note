import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

type ExerciseTile = {
  id: string;
  name: string;
  duration_minutes: number;
  photo_path: string | null;
};

// 写真を見られる期限つきURLの有効時間（秒）
const PHOTO_URL_EXPIRES_IN = 60 * 60;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 text-lg">
      <h1 className="text-3xl font-bold">リハビリ運動ノート</h1>
      <Link
        href="/exercises/new"
        className="rounded-xl bg-teal-600 py-4 text-center text-xl font-bold text-white"
      >
        ＋ 運動を追加
      </Link>
      <Suspense fallback={<p>読み込み中…</p>}>
        <ExerciseList />
      </Suspense>
    </main>
  );
}

async function ExerciseList() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 登録した順（古いものが先）に並べる
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, duration_minutes, photo_path")
    .order("created_at", { ascending: true })
    .returns<ExerciseTile[]>();

  // 写真は非公開なので、本人用の期限つきURLをまとめて発行する
  const photoPaths = (exercises ?? []).flatMap((exercise) =>
    exercise.photo_path ? [exercise.photo_path] : [],
  );
  const photoUrls = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("exercise-photos")
      .createSignedUrls(photoPaths, PHOTO_URL_EXPIRES_IN);
    signedUrls?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) {
        photoUrls.set(path, signedUrl);
      }
    });
  }

  return (
    <>
      {error ? (
        <p role="alert" className="text-red-600">
          運動を読み込めませんでした。ページを開きなおしてください
        </p>
      ) : exercises.length === 0 ? (
        <p>
          まだ運動が登録されていません。上の「＋ 運動を追加」から登録しましょう。
        </p>
      ) : (
        <ul className="grid grid-cols-3 gap-3">
          {exercises.map((exercise) => {
            const photoUrl = exercise.photo_path
              ? photoUrls.get(exercise.photo_path)
              : undefined;
            return (
              <li key={exercise.id} className="flex flex-col gap-1">
                <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-zinc-100 text-sm text-zinc-500">
                  {photoUrl ? (
                    // ログインが必要な写真なので、Next.js の画像変換は使わない
                    <Image
                      src={photoUrl}
                      alt={exercise.name}
                      fill
                      unoptimized
                      sizes="33vw"
                      className="object-cover"
                    />
                  ) : (
                    "写真なし"
                  )}
                </div>
                <p className="line-clamp-2 text-base font-bold leading-snug break-words">
                  {exercise.name}
                </p>
                <p className="text-base text-zinc-600">
                  {exercise.duration_minutes}分
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <footer className="mt-auto flex flex-col items-center gap-2 pt-8 text-sm text-zinc-500">
        <p>ログイン中：{user.email}</p>
        <form action={logout}>
          <button type="submit" className="px-4 py-2 underline">
            ログアウト
          </button>
        </form>
      </footer>
    </>
  );
}
