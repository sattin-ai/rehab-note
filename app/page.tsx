import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/app/login/actions";
import { getExerciseTiles } from "./exercises/get-exercise-tiles";
import { ExerciseGrid } from "./exercise-grid";

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
  const { tiles, email } = await getExerciseTiles();

  return (
    <>
      {!tiles ? (
        <p role="alert" className="text-red-600">
          運動を読み込めませんでした。ページを開きなおしてください
        </p>
      ) : tiles.length === 0 ? (
        <p>
          まだ運動が登録されていません。上の「＋ 運動を追加」から登録しましょう。
        </p>
      ) : (
        <ExerciseGrid tiles={tiles} />
      )}
      <footer className="mt-auto flex flex-col items-center gap-2 pt-8 text-sm text-zinc-500">
        <p>ログイン中：{email}</p>
        <form action={logout}>
          <button type="submit" className="px-4 py-2 underline">
            ログアウト
          </button>
        </form>
      </footer>
    </>
  );
}
