"use client";

import { useActionState } from "react";
import type { ExerciseFormState } from "./actions";

type Props = {
  action: (
    prevState: ExerciseFormState,
    formData: FormData,
  ) => Promise<ExerciseFormState>;
};

const initialState: ExerciseFormState = {
  error: null,
  message: null,
  values: null,
};

const inputClass = "rounded-xl border border-zinc-300 px-4 py-3 text-xl";

// 追加画面と編集画面で使い回す入力フォーム
export function ExerciseForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const values = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span>名前（必須）</span>
        <input
          type="text"
          name="name"
          required
          defaultValue={values?.name}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>やり方</span>
        <textarea
          name="instructions"
          rows={5}
          defaultValue={values?.instructions}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>意識する筋肉</span>
        <input
          type="text"
          name="targetMuscles"
          defaultValue={values?.targetMuscles}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>代償しやすい筋肉</span>
        <input
          type="text"
          name="compensationMuscles"
          defaultValue={values?.compensationMuscles}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-2">
        <span>所要時間（分・必須）</span>
        <input
          type="number"
          name="durationMinutes"
          required
          min={1}
          max={180}
          step={1}
          inputMode="numeric"
          defaultValue={values?.durationMinutes}
          className={inputClass}
        />
      </label>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      {state.message && (
        <p role="status" className="text-teal-700">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-teal-600 py-4 text-xl font-bold text-white disabled:opacity-60"
      >
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
