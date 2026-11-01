"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { CAPTION_MAX_LENGTH, MAX_PHOTOS, PHOTO_MAX_BYTES } from "./photo-rules";

// 編集画面の写真の操作（ボタンを押したらその場で保存する）
export type PhotoActionResult = {
  error: string | null;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

type PhotoRow = {
  id: string;
  path: string;
  position: number;
  is_top: boolean;
};

const OK: PhotoActionResult = { error: null };
const FAILED: PhotoActionResult = {
  error: "保存できませんでした。もう一度ためしてください",
};

// ログインしている人の Supabase クライアントを返す（していなければ null）
async function getSupabase(): Promise<{
  supabase: SupabaseClient;
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}

// その運動の写真を①から順に読みこむ（自分以外の運動なら空になる）
async function getPhotos(supabase: SupabaseClient, exerciseId: string) {
  return supabase
    .from("exercise_photos")
    .select("id, path, position, is_top")
    .eq("exercise_id", exerciseId)
    .order("position")
    .returns<PhotoRow[]>();
}

// 番号を ①②③… と詰めなおす（変わる写真だけ保存する）。失敗したら false
async function renumberPhotos(
  supabase: SupabaseClient,
  photos: PhotoRow[],
): Promise<boolean> {
  const results = await Promise.all(
    photos.flatMap((photo, index) =>
      photo.position === index + 1
        ? []
        : [
            supabase
              .from("exercise_photos")
              .update({ position: index + 1 })
              .eq("id", photo.id),
          ],
    ),
  );
  return results.every((result) => !result.error);
}

// 一覧・詳しいページ・編集画面の古い表示を捨てる
function revalidateExercise(exerciseId: string) {
  revalidatePath("/");
  revalidatePath(`/exercises/${exerciseId}`);
  revalidatePath(`/exercises/${exerciseId}/edit`);
}

// 写真を足す（一番うしろの番号になる。0枚の運動なら1枚目がトップ）
export async function addPhotos(
  exerciseId: string,
  formData: FormData,
): Promise<PhotoActionResult> {
  const photos = formData
    .getAll("photos")
    .filter((photo): photo is File => photo instanceof File && photo.size > 0);
  if (photos.length === 0) {
    return { error: "写真を選んでください" };
  }
  if (
    photos.some(
      (photo) => photo.type !== "image/jpeg" || photo.size > PHOTO_MAX_BYTES,
    )
  ) {
    return { error: "使えない写真があります。別の写真を選んでください" };
  }

  const session = await getSupabase();
  if (!session) {
    return { error: "ログインしなおしてください" };
  }
  const { supabase, userId } = session;

  const { data: current, error: currentError } = await getPhotos(
    supabase,
    exerciseId,
  );
  if (currentError) {
    return FAILED;
  }
  if (current.length + photos.length > MAX_PHOTOS) {
    return { error: `写真は${MAX_PHOTOS}枚までです` };
  }
  // 番号に抜けがあっても、足す前に詰めておけば一番うしろの番号がずれない
  if (!(await renumberPhotos(supabase, current))) {
    return FAILED;
  }

  // 写真は自分のユーザーID名のフォルダに保存する（Storage のルールで本人だけ使える）
  const photoPaths = photos.map(() => `${userId}/${crypto.randomUUID()}.jpg`);
  async function removeUploadedPhotos() {
    await supabase.storage.from("exercise-photos").remove(photoPaths);
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
    return { error: "写真を保存できませんでした。もう一度ためしてください" };
  }

  // 自分以外の運動には、Supabase のルールで足せない
  const { error } = await supabase.from("exercise_photos").insert(
    photoPaths.map((path, index) => ({
      exercise_id: exerciseId,
      user_id: userId,
      path,
      caption: "",
      position: current.length + index + 1,
      is_top: current.length === 0 && index === 0,
    })),
  );
  if (error) {
    await removeUploadedPhotos();
    return FAILED;
  }

  revalidateExercise(exerciseId);
  return OK;
}

// 写真を1枚消す（表の行と Storage のファイルの両方）。番号を詰め、トップなら①をトップにする
export async function deletePhoto(
  exerciseId: string,
  photoId: string,
): Promise<PhotoActionResult> {
  const session = await getSupabase();
  if (!session) {
    return { error: "ログインしなおしてください" };
  }
  const { supabase } = session;

  const { data: photos, error: photosError } = await getPhotos(
    supabase,
    exerciseId,
  );
  const target = photos?.find((photo) => photo.id === photoId);
  if (photosError || !target) {
    return { error: "削除できませんでした。もう一度ためしてください" };
  }

  // 表を先に消す。写真ファイルが消えずに残っても、だれにも見えないので困らない
  const { data: deleted, error } = await supabase
    .from("exercise_photos")
    .delete()
    .eq("id", photoId)
    .eq("exercise_id", exerciseId)
    .select("id");
  if (error || deleted.length === 0) {
    return { error: "削除できませんでした。もう一度ためしてください" };
  }
  await supabase.storage.from("exercise-photos").remove([target.path]);

  const remaining = photos.filter((photo) => photo.id !== photoId);
  let fixed = await renumberPhotos(supabase, remaining);
  if (target.is_top && remaining.length > 0) {
    const { error: topError } = await supabase
      .from("exercise_photos")
      .update({ is_top: true })
      .eq("id", remaining[0].id);
    fixed = fixed && !topError;
  }

  revalidateExercise(exerciseId);
  if (!fixed) {
    return {
      error:
        "写真は消しましたが、番号やトップの写真を直せませんでした。ページを開きなおしてください",
    };
  }
  return OK;
}

// 写真の説明を直す
export async function updatePhotoCaption(
  exerciseId: string,
  photoId: string,
  caption: string,
): Promise<PhotoActionResult> {
  const trimmed = caption.trim();
  if (trimmed.length > CAPTION_MAX_LENGTH) {
    return {
      error: `写真の説明は${CAPTION_MAX_LENGTH}文字までにしてください`,
    };
  }

  const session = await getSupabase();
  if (!session) {
    return { error: "ログインしなおしてください" };
  }
  const { supabase } = session;

  const { data: updated, error } = await supabase
    .from("exercise_photos")
    .update({ caption: trimmed })
    .eq("id", photoId)
    .eq("exercise_id", exerciseId)
    .select("id");
  if (error || updated.length === 0) {
    return FAILED;
  }

  revalidateExercise(exerciseId);
  return OK;
}

// トップの写真を選び直す
export async function setTopPhoto(
  exerciseId: string,
  photoId: string,
): Promise<PhotoActionResult> {
  const session = await getSupabase();
  if (!session) {
    return { error: "ログインしなおしてください" };
  }
  const { supabase } = session;

  const { data: photos, error: photosError } = await getPhotos(
    supabase,
    exerciseId,
  );
  if (photosError || !photos.some((photo) => photo.id === photoId)) {
    return FAILED;
  }
  const currentTop = photos.find((photo) => photo.is_top);
  if (currentTop?.id === photoId) {
    return OK;
  }

  // 「トップは1枚だけ」の決まりがあるので、先に今のトップの印を外してからつける
  if (currentTop) {
    const { error: unsetError } = await supabase
      .from("exercise_photos")
      .update({ is_top: false })
      .eq("id", currentTop.id);
    if (unsetError) {
      return FAILED;
    }
  }
  const { data: updated, error } = await supabase
    .from("exercise_photos")
    .update({ is_top: true })
    .eq("id", photoId)
    .eq("exercise_id", exerciseId)
    .select("id");
  if (error || updated.length === 0) {
    // 失敗したら、元の写真に印を戻す
    if (currentTop) {
      await supabase
        .from("exercise_photos")
        .update({ is_top: true })
        .eq("id", currentTop.id);
    }
    return FAILED;
  }

  revalidateExercise(exerciseId);
  return OK;
}
