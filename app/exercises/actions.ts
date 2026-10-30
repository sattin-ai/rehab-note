"use server";

import { createClient } from "@/lib/supabase/server";

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

  // 写真は自分のユーザーID名のフォルダに保存する（Storage のルールで本人だけ使える）
  const photo = formData.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (photo.type !== "image/jpeg") {
      return {
        error: "この写真は使えません。別の写真を選んでください",
        message: null,
        values,
      };
    }
    photoPath = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("exercise-photos")
      .upload(photoPath, photo, { contentType: "image/jpeg" });
    if (uploadError) {
      return {
        error: "写真を保存できませんでした。もう一度ためしてください",
        message: null,
        values,
      };
    }
  }

  const { error } = await supabase.from("exercises").insert({
    user_id: user.id,
    name: values.name,
    instructions: values.instructions,
    target_muscles: values.targetMuscles,
    compensation_muscles: values.compensationMuscles,
    duration_minutes: duration,
    photo_path: photoPath,
  });

  if (error) {
    // 運動を保存できなかったので、先に保存した写真を片づける
    if (photoPath) {
      await supabase.storage.from("exercise-photos").remove([photoPath]);
    }
    return {
      error: "保存できませんでした。もう一度ためしてください",
      message: null,
      values,
    };
  }

  return { error: null, message: `「${values.name}」を保存しました`, values: null };
}
