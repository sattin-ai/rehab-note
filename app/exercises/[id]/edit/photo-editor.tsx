"use client";

import { type ChangeEvent, useState, useTransition } from "react";
import { compressImage } from "../../compress-image";
import { inputClass } from "../../exercise-form";
import {
  addPhotos,
  deletePhoto,
  type PhotoActionResult,
  setTopPhoto,
  updatePhotoCaption,
} from "../../photo-actions";
import {
  CAPTION_MAX_LENGTH,
  MAX_PHOTOS,
  PHOTO_MAX_BYTES,
  PHOTO_NUMBERS,
} from "../../photo-rules";

export type EditablePhoto = {
  id: string;
  url: string | undefined;
  caption: string;
  isTop: boolean;
};

type Props = {
  exerciseId: string;
  photos: EditablePhoto[];
};

// 編集画面の写真の欄。ボタンを押したら、その場で保存する（文字の「保存」ボタンとは別）
export function PhotoEditor({ exerciseId, photos }: Props) {
  const [pending, startTransition] = useTransition();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // 2つの操作が同時に走らないように、操作中は写真のボタンをすべて止める
  const busy = pending || preparing;

  function run(action: () => Promise<PhotoActionResult>, doneMessage: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) {
        setError(result.error);
      } else {
        setMessage(doneMessage);
      }
    });
  }

  function handleDelete(photoId: string, index: number) {
    if (
      !window.confirm(
        `${PHOTO_NUMBERS[index]}の写真を消しますか？\n元に戻せません。`,
      )
    ) {
      return;
    }
    run(() => deletePhoto(exerciseId, photoId), "写真を消しました");
  }

  // 選んだ写真を1枚ずつ軽くしてから、まとめて保存する
  async function handleAdd(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    // 同じ写真をもう一度選べるように、選択を空に戻す
    input.value = "";
    setError(null);
    setMessage(null);
    if (files.length === 0) {
      return;
    }
    const room = MAX_PHOTOS - photos.length;
    if (files.length > room) {
      setError(`写真は${MAX_PHOTOS}枚までです（あと${room}枚足せます）`);
      return;
    }

    setPreparing(true);
    const formData = new FormData();
    try {
      for (const file of files) {
        const blob = await compressImage(file);
        if (blob.size > PHOTO_MAX_BYTES) {
          throw new Error("photo is too large");
        }
        formData.append("photos", blob, "photo.jpg");
      }
    } catch {
      setError("使えない写真がありました。別の写真を選んでください");
      return;
    } finally {
      setPreparing(false);
    }
    run(() => addPhotos(exerciseId, formData), "写真を足しました");
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-heading font-bold">写真</h2>
      <p className="text-note text-zinc-600">
        写真の欄は、ボタンを押すとすぐ保存されます（下の「保存」ボタンとは別です）
      </p>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {busy ? (
        <p role="status">保存中…</p>
      ) : (
        message && (
          <p role="status" className="text-teal-700">
            {message}
          </p>
        )
      )}

      {photos.length === 0 ? (
        <p className="text-zinc-500">写真はありません</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {photos.map((photo, index) => (
            <PhotoItem
              key={photo.id}
              photo={photo}
              index={index}
              canChangeTop={photos.length >= 2}
              busy={busy}
              onDelete={() => handleDelete(photo.id, index)}
              onSetTop={() =>
                run(
                  () => setTopPhoto(exerciseId, photo.id),
                  `${PHOTO_NUMBERS[index]}をトップの写真にしました`,
                )
              }
              onSaveCaption={(caption) =>
                run(
                  () => updatePhotoCaption(exerciseId, photo.id, caption),
                  `${PHOTO_NUMBERS[index]}の説明を保存しました`,
                )
              }
            />
          ))}
        </ol>
      )}

      {photos.length < MAX_PHOTOS && (
        <label className="flex flex-col gap-2">
          <span className="text-note">
            写真を足す（あと{MAX_PHOTOS - photos.length}枚）
          </span>
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            onChange={handleAdd}
            className="text-note file:mr-3 file:min-h-12 file:rounded-xl file:border-2 file:border-teal-600 file:bg-transparent file:px-4 file:text-body file:font-bold file:text-teal-700 disabled:opacity-60"
          />
        </label>
      )}
    </section>
  );
}

type PhotoItemProps = {
  photo: EditablePhoto;
  index: number;
  canChangeTop: boolean;
  busy: boolean;
  onDelete: () => void;
  onSetTop: () => void;
  onSaveCaption: (caption: string) => void;
};

function PhotoItem({
  photo,
  index,
  canChangeTop,
  busy,
  onDelete,
  onSetTop,
  onSaveCaption,
}: PhotoItemProps) {
  // 「説明を保存」を押すまでは、この画面の中だけで書きかえる
  const [caption, setCaption] = useState(photo.caption);

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-zinc-300 p-3">
      <div className="flex items-start gap-3">
        <span className="text-heading font-bold">{PHOTO_NUMBERS[index]}</span>
        {photo.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- ログインが必要な写真なので next/image は使わない
          <img
            src={photo.url}
            alt={`今の写真${PHOTO_NUMBERS[index]}`}
            className="aspect-square w-28 rounded-xl object-cover"
          />
        ) : (
          <span className="flex aspect-square w-28 items-center justify-center rounded-xl bg-zinc-100 px-1 text-center text-note text-zinc-500">
            読み込めません
          </span>
        )}
        <div className="ml-auto flex flex-col items-end gap-2">
          {photo.isTop ? (
            <span className="font-bold text-teal-700">★トップの写真</span>
          ) : (
            canChangeTop && (
              <button
                type="button"
                disabled={busy}
                onClick={onSetTop}
                className="rounded-xl border-2 border-teal-600 min-h-12 px-4 text-body font-bold text-teal-700 disabled:opacity-60"
              >
                トップにする
              </button>
            )
          )}
        </div>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-note">
          説明（{CAPTION_MAX_LENGTH}文字まで・なしでもOK）
        </span>
        <input
          type="text"
          value={caption}
          maxLength={CAPTION_MAX_LENGTH}
          onChange={(event) => setCaption(event.currentTarget.value)}
          className={inputClass}
        />
      </label>
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={busy || caption === photo.caption}
          onClick={() => onSaveCaption(caption)}
          className="rounded-xl bg-teal-600 min-h-12 px-5 text-body font-bold text-white disabled:opacity-60"
        >
          説明を保存
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="min-h-12 px-2 text-body text-red-600 underline disabled:opacity-60"
        >
          この写真を消す
        </button>
      </div>
    </li>
  );
}
