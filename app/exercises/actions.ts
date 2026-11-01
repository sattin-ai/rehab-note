"use server";

import { createClient } from "@/lib/supabase/server";
import { CAPTION_MAX_LENGTH, MAX_PHOTOS, PHOTO_MAX_BYTES } from "./photo-rules";

export type ExerciseValues = {
  name: string;
  instructions: string;
  targetMuscles: string;
  compensationMuscles: string;
  durationMinutes: string;
};

export type ExerciseFormState = {
  error: string | null;
  message: string | null;
  // エラーのときに入力した内容を残すため
  values: ExerciseValues | null;
};

export async function createExercise(
  _prevState: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const values: ExerciseValues = {
    name: String(formData.get("name") ?? "").trim(),
    instructions: String(formData.get("instructions") ?? "").trim(),
    targetMuscles: String(formData.get("targetMuscles") ?? "").trim(),
    compensationMuscles: String(formData.get("compensationMuscles") ?? "").trim(),
    durationMinutes: String(formData.get("durationMinutes") ?? "").trim(),
  };

  if (!values.name) {
    return { error: "名前を入力してください", message: null, values };
  }
  const duration = Number(values.durationMinutes);
  if (!Number.isInteger(duration) || duration < 1 || duration > 180) {
    return {
      error: "所要時間は 1〜180 の数字（分）で入力してください",
      message: null,
      values,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "ログインしなおしてください", message: null, values };
  }

  // 写真と説明は、入れた順（①②③…）で同じ順番に届く
  const photos = formData
    .getAll("photos")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0);
  const captions = formData
    .getAll("captions")
    .map((caption) => String(caption).trim());

  if (photos.length > MAX_PHOTOS) {
    return { error: `写真は${MAX_PHOTOS}枚までです`, message: null, values };
  }
  if (
    photos.some(
      (photo) => photo.type !== "image/jpeg" || photo.size > PHOTO_MAX_BYTES,
    )
  ) {
    return {
      error: "使えない写真があります。別の写真を選んでください",
      message: null,
      values,
    };
  }
  if (captions.some((caption) => caption.length > CAPTION_MAX_LENGTH)) {
    return {
      error: `写真の説明は${CAPTION_MAX_LENGTH}文字までにしてください`,
      message: null,
      values,
    };
  }
  // トップの写真が何番目か。おかしな値なら①にする
  const requestedTopIndex = Number(formData.get("topIndex"));
  const topIndex =
    Number.isInteger(requestedTopIndex) &&
    requestedTopIndex >= 0 &&
    requestedTopIndex < photos.length
      ? requestedTopIndex
      : 0;

  // 写真は自分のユーザーID名のフォルダに保存する（Storage のルールで本人だけ使える）
  const photoPaths = photos.map(() => `${user.id}/${crypto.randomUUID()}.jpg`);
  async function removeUploadedPhotos() {
    if (photoPaths.length > 0) {
      await supabase.storage.from("exercise-photos").remove(photoPaths);
    }
  }

  const uploads = await Promise.all(
    photos.map((photo, index) =>
      supabase.storage
        .from("exercise-photos")
        .upload(photoPaths[index], photo, { contentType: "image/jpeg" }),
    ),
  );
  if (uploads.some((upload) => upload.error)) {
    await removeUploadedPhotos();
    return {
      error: "写真を保存できませんでした。もう一度ためしてください",
      message: null,
      values,
    };
  }

  const { data: exercise, error } = await supabase
    .from("exercises")
    .insert({
      user_id: user.id,
      name: values.name,
      instructions: values.instructions,
      target_muscles: values.targetMuscles,
      compensation_muscles: values.compensationMuscles,
      duration_minutes: duration,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    // 運動を保存できなかったので、先に保存した写真を片づける
    await removeUploadedPhotos();
    return {
      error: "保存できませんでした。もう一度ためしてください",
      message: null,
      values,
    };
  }

  if (photoPaths.length > 0) {
    const { error: photosError } = await supabase.from("exercise_photos").insert(
      photoPaths.map((path, index) => ({
        exercise_id: exercise.id,
        user_id: user.id,
        path,
        caption: captions[index] ?? "",
        position: index + 1,
        is_top: index === topIndex,
      })),
    );
    if (photosError) {
      // 写真の情報を保存できなかったので、運動ごと取り消す
      await supabase.from("exercises").delete().eq("id", exercise.id);
      await removeUploadedPhotos();
      return {
        error: "保存できませんでした。もう一度ためしてください",
        message: null,
        values,
      };
    }
  }

  return { error: null, message: `「${values.name}」を保存しました`, values: null };
}
