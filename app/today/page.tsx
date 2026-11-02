import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { getExerciseTiles } from "../exercises/get-exercise-tiles";
import { TodayList } from "./today-list";

export const metadata: Metadata = {
  title: "今日のセット｜リハビリ運動ノート",
};

export default function TodayPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 text-lg">
      <Link href="/" className="text-teal-700 underline">
        ← 一覧へ戻る
      </Link>
      <h1 className="text-3xl font-bold">今日のセット</h1>
      <Suspense fallback={<p>読み込み中…</p>}>
        <TodayContent />
      </Suspense>
    </main>
  );
}

async function TodayContent() {
  // 選んだ内容はブラウザにあるので、運動は全部読んでブラウザ側で絞りこむ
  const { tiles } = await getExerciseTiles();
  if (!tiles) {
    return (
      <p role="alert" className="text-red-600">
        運動を読み込めませんでした。ページを開きなおしてください
      </p>
    );
  }
  return <TodayList tiles={tiles} />;
}
