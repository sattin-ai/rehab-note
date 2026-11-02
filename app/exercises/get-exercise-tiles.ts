import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 一覧のタイル・今日のセットで使う、運動1つ分のデータ
export type ExerciseTile = {
  id: string;
  name: string;
  duration_minutes: number;
  // トップの写真の期限つきURL（写真がなければ null）
  photoUrl: string | null;
};

type ExerciseRow = {
  id: string;
  name: string;
  duration_minutes: number;
  // トップの写真だけを受け取る（写真がなければ空）
  exercise_photos: { path: string }[];
};

// 写真を見られる期限つきURLの有効時間（秒）
const PHOTO_URL_EXPIRES_IN = 60 * 60;

// 自分の運動を登録した順に、トップの写真つきで読みこむ（一覧と今日のセットで使う）
// 読みこみに失敗したら null を返す
export async function getExerciseTiles(): Promise<{
  tiles: ExerciseTile[] | null;
  email: string | undefined;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 登録した順（古いものが先）に並べる
  const { data: exercises, error } = await supabase
    .from("exercises")
    .select("id, name, duration_minutes, exercise_photos(path)")
    .eq("exercise_photos.is_top", true)
    .order("created_at", { ascending: true })
    .returns<ExerciseRow[]>();

  if (error) {
    return { tiles: null, email: user.email };
  }

  // 写真は非公開なので、本人用の期限つきURLをまとめて発行する
  const photoPaths = exercises.flatMap((exercise) =>
    exercise.exercise_photos.map((photo) => photo.path),
  );
  const photoUrls = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("exercise-photos")
      .createSignedUrls(photoPaths, PHOTO_URL_EXPIRES_IN);
    signedUrls?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) {
        photoUrls.set(path, signedUrl);
      }
    });
  }

  const tiles = exercises.map((exercise) => {
    const topPhotoPath = exercise.exercise_photos[0]?.path;
    return {
      id: exercise.id,
      name: exercise.name,
      duration_minutes: exercise.duration_minutes,
      photoUrl: (topPhotoPath && photoUrls.get(topPhotoPath)) || null,
    };
  });

  return { tiles, email: user.email };
}
