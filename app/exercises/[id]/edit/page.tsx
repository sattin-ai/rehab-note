import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteExercise, updateExercise } from "../../actions";
import { ExerciseForm } from "../../exercise-form";
import { getExercise } from "../../get-exercise";
import { DeleteButton } from "./delete-button";

export const metadata: Metadata = {
  title: "運動の編集｜リハビリ運動ノート",
};

export default function EditExercisePage({
  params,
}: PageProps<"/exercises/[id]/edit">) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-6 py-12 text-lg">
      <Suspense fallback={<p>読み込み中…</p>}>
        {params.then(({ id }) => (
          <EditContent id={id} />
        ))}
      </Suspense>
    </main>
  );
}

async function EditContent({ id }: { id: string }) {
  const result = await getExercise(id);
  if (!result) {
    return (
      <p role="alert" className="text-red-600">
        運動を読み込めませんでした。ページを開きなおしてください
      </p>
    );
  }
  const { exercise, photoUrls } = result;

  return (
    <>
      <Link href={`/exercises/${exercise.id}`} className="text-teal-700 underline">
        ← 詳しいページへ戻る
      </Link>
      <h1 className="text-3xl font-bold">運動の編集</h1>
      <ExerciseForm
        action={updateExercise.bind(null, exercise.id)}
        defaultValues={{
          name: exercise.name,
          instructions: exercise.instructions ?? "",
          targetMuscles: exercise.target_muscles ?? "",
          compensationMuscles: exercise.compensation_muscles ?? "",
          durationMinutes: String(exercise.duration_minutes),
        }}
        existingPhotos={exercise.exercise_photos.map((photo) => ({
          url: photoUrls.get(photo.path),
          caption: photo.caption,
        }))}
      />
      {/* まちがえて押さないように、保存ボタンからはなして置く */}
      <div className="mt-8 border-t border-zinc-300 pt-8">
        <DeleteButton action={deleteExercise.bind(null, exercise.id)} />
      </div>
    </>
  );
}
