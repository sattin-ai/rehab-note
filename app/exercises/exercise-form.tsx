"use client";

import { type ChangeEvent, useActionState, useState } from "react";
import type { ExerciseFormState, ExerciseValues } from "./actions";
import { compressImage } from "./compress-image";
import {
  CAPTION_MAX_LENGTH,
  MAX_PHOTOS,
  PHOTO_MAX_BYTES,
  PHOTO_NUMBERS,
} from "./photo-rules";

type Props = {
  action: (
    prevState: ExerciseFormState,
    formData: FormData,
  ) => Promise<ExerciseFormState>;
  // 編集のとき：今の内容
  defaultValues?: ExerciseValues;
  // 編集のときは false。写真は編集画面の写真の欄で、その場で保存する
  showPhotoPicker?: boolean;
};

type Photo = {
  blob: Blob;
  previewUrl: string;
  caption: string;
};

const initialState: ExerciseFormState = {
  error: null,
  message: null,
  values: null,
};

export const inputClass = "rounded-xl border border-zinc-300 px-4 py-3 text-xl";

// 追加画面と編集画面で使い回す入力フォーム
export function ExerciseForm({
  action,
  defaultValues,
  showPhotoPicker = true,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [photos, setPhotos] = useState<Photo[]>([]);
  // トップの写真が何番目か（0 が①）
  const [topIndex, setTopIndex] = useState(0);
  const [preparingPhotos, setPreparingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lastState, setLastState] = useState(state);
  // エラーのときは入力した内容、それ以外は今の内容（追加のときは空）
  const values = state.values ?? defaultValues;

  // 保存できたら、選んだ写真も消して次の入力に備える
  if (state !== lastState) {
    setLastState(state);
    if (state.message) {
      photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      setPhotos([]);
      setTopIndex(0);
    }
  }

  // 選んだ写真を1枚ずつ軽くして、うしろに足していく
  async function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    // 同じ写真をもう一度選べるように、選択を空に戻す
    input.value = "";
    setPhotoError(null);
    if (files.length === 0) {
      return;
    }

    const room = MAX_PHOTOS - photos.length;
    setPreparingPhotos(true);
    const added: Photo[] = [];
    let failed = false;
    for (const file of files.slice(0, room)) {
      try {
        const blob = await compressImage(file);
        if (blob.size > PHOTO_MAX_BYTES) {
          throw new Error("photo is too large");
        }
        added.push({ blob, previewUrl: URL.createObjectURL(blob), caption: "" });
      } catch {
        failed = true;
      }
    }
    setPhotos((current) => [...current, ...added]);
    setPreparingPhotos(false);

    if (files.length > room) {
      setPhotoError(`写真は${MAX_PHOTOS}枚までです`);
    } else if (failed) {
      setPhotoError("使えない写真がありました。別の写真を選んでください");
    }
  }

  function changeCaption(index: number, caption: string) {
    setPhotos((current) =>
      current.map((photo, i) => (i === index ? { ...photo, caption } : photo)),
    );
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photos[index].previewUrl);
    setPhotos((current) => current.filter((_, i) => i !== index));
    setPhotoError(null);
    // トップの写真をやめたら①に戻す。前の写真をやめたら、同じ写真がトップのままになるよう詰める
    if (index === topIndex) {
      setTopIndex(0);
    } else if (index < topIndex) {
      setTopIndex(topIndex - 1);
    }
  }

  // 元の重い写真ではなく、軽くした写真と説明を ①②③… の順番で送る
  function submit(formData: FormData) {
    photos.forEach((photo) => {
      formData.append("photos", photo.blob, "photo.jpg");
      formData.append("captions", photo.caption);
    });
    formData.set("topIndex", String(topIndex));
    formAction(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-6">
      {showPhotoPicker && (
        <div className="flex flex-col gap-3">
          <span>写真（{MAX_PHOTOS}枚まで・なしでもOK）</span>
          {photos.length > 0 && (
            <ol className="flex flex-col gap-4">
              {photos.map((photo, index) => (
                <li
                  key={photo.previewUrl}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-300 p-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl font-bold">
                      {PHOTO_NUMBERS[index]}
                    </span>
                    {/* eslint-disable-next-line @next/next/no-img-element -- ブラウザ内の一時的なプレビューなので next/image は使わない */}
                    <img
                      src={photo.previewUrl}
                      alt={`選んだ写真${PHOTO_NUMBERS[index]}`}
                      className="aspect-square w-28 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="ml-auto px-2 py-1 text-base text-red-600 underline"
                    >
                      この写真をやめる
                    </button>
                  </div>
                  <label className="flex flex-col gap-1">
                    <span className="text-base">
                      説明（{CAPTION_MAX_LENGTH}文字まで・なしでもOK）
                    </span>
                    <input
                      type="text"
                      value={photo.caption}
                      maxLength={CAPTION_MAX_LENGTH}
                      onChange={(event) =>
                        changeCaption(index, event.currentTarget.value)
                      }
                      className={inputClass}
                    />
                  </label>
                  {photos.length >= 2 && (
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="topPhoto"
                        checked={index === topIndex}
                        onChange={() => setTopIndex(index)}
                        className="size-6"
                      />
                      <span>一覧に出すトップの写真にする</span>
                    </label>
                  )}
                </li>
              ))}
            </ol>
          )}
          {preparingPhotos ? (
            <p role="status">写真を準備中…</p>
          ) : (
            photos.length < MAX_PHOTOS && (
              <label className="flex flex-col gap-2">
                <span className="text-base">
                  写真を選ぶ（あと{MAX_PHOTOS - photos.length}枚）
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="text-base"
                />
              </label>
            )
          )}
        </div>
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
        disabled={pending || preparingPhotos}
        className="rounded-xl bg-teal-600 py-4 text-xl font-bold text-white disabled:opacity-60"
      >
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
