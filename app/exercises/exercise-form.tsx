"use client";

import { type ChangeEvent, useActionState, useState } from "react";
import type { ExerciseFormState } from "./actions";

type Props = {
  action: (
    prevState: ExerciseFormState,
    formData: FormData,
  ) => Promise<ExerciseFormState>;
};

type Photo = {
  blob: Blob;
  previewUrl: string;
};

const initialState: ExerciseFormState = {
  error: null,
  message: null,
  values: null,
};

const inputClass = "rounded-xl border border-zinc-300 px-4 py-3 text-xl";

// 写真は長い辺を 1200px までにして JPEG で軽くする
const PHOTO_MAX_SIDE = 1200;
const PHOTO_QUALITY = 0.8;
// Next.js がサーバーへ送れるのは 1MB までなので、少し余裕をもたせる
const PHOTO_MAX_BYTES = 900 * 1024;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    PHOTO_MAX_SIDE / Math.max(bitmap.width, bitmap.height),
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas is not supported");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      PHOTO_QUALITY,
    );
  });
}

// 追加画面と編集画面で使い回す入力フォーム
export function ExerciseForm({ action }: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastState, setLastState] = useState(state);
  const values = state.values;

  // 保存できたら、選んだ写真も消して次の入力に備える
  if (state !== lastState) {
    setLastState(state);
    if (state.message) {
      setPhoto(null);
    }
  }

  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    setPhotoError(null);
    if (photo) {
      URL.revokeObjectURL(photo.previewUrl);
    }
    if (!file) {
      setPhoto(null);
      return;
    }

    try {
      const blob = await compressImage(file);
      if (blob.size > PHOTO_MAX_BYTES) {
        throw new Error("photo is too large");
      }
      setPhoto({ blob, previewUrl: URL.createObjectURL(blob) });
    } catch {
      setPhoto(null);
      setPhotoError("この写真は使えません。別の写真を選んでください");
      input.value = "";
    }
  }

  // 元の重い写真ではなく、軽くした写真だけを送る
  function submit(formData: FormData) {
    if (photo) {
      formData.set("photo", photo.blob, "photo.jpg");
    }
    formAction(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-6">
      <label className="flex flex-col gap-2">
        <span>写真（1枚）</span>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="text-base"
        />
      </label>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- ブラウザ内の一時的なプレビューなので next/image は使わない
        <img
          src={photo.previewUrl}
          alt="選んだ写真"
          className="aspect-square w-40 rounded-2xl object-cover"
        />
      )}
      {photoError && (
        <p role="alert" className="text-red-600">
          {photoError}
        </p>
      )}
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
