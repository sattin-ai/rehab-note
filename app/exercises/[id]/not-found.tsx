import Link from "next/link";

// 存在しない運動や、自分以外の運動を開いたときに出す
export default function ExerciseNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10 text-body">
      <h1 className="text-title font-bold">運動が見つかりません</h1>
      <p>消されたか、見られない運動です。</p>
      <Link href="/" className="inline-flex min-h-12 items-center self-start text-teal-700 underline">
        ← 一覧へ戻る
      </Link>
    </main>
  );
}
