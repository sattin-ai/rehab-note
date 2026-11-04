import type { Metadata } from "next";
import Link from "next/link";
import { createExercise } from "../actions";
import { ExerciseForm } from "../exercise-form";

export const metadata: Metadata = {
  title: "運動の追加｜リハビリ運動ノート",
};

export default function NewExercisePage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10 text-body">
      <Link href="/" className="inline-flex min-h-12 items-center self-start text-teal-700 underline">
        ← トップへ戻る
      </Link>
      <h1 className="text-title font-bold">運動の追加</h1>
      <ExerciseForm action={createExercise} />
    </main>
  );
}
