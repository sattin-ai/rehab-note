import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ExerciseDetail = {
  id: string;
  name: string;
  duration_minutes: number;
  instructions: string | null;
  target_muscles: string | null;
  compensation_muscles: string | null;
  exercise_photos: {
    id: string;
    path: string;
    caption: string;
    position: number;
    is_top: boolean;
  }[];
};

// 写真を見られる期限つきURLの有効時間（秒）
const PHOTO_URL_EXPIRES_IN = 60 * 60;

// 運動の id は uuid の形。ちがう形なら問い合わせずに「見つかりません」にする
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 運動を1つと、その写真（①から順）の期限つきURLを読みこむ（詳しいページと編集画面で使う）
// 見つからなければ「見つかりません」、読みこみに失敗したら null を返す
export async function getExercise(id: string): Promise<{
  exercise: ExerciseDetail;
  photoUrls: Map<string, string>;
} | null> {
  if (!UUID_PATTERN.test(id)) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 自分以外の運動は、Supabase のルールでデータが返ってこない（＝見つからない）
  const { data: exercise, error } = await supabase
    .from("exercises")
    .select(
      "id, name, duration_minutes, instructions, target_muscles, compensation_muscles, exercise_photos(id, path, caption, position, is_top)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "exercise_photos" })
    .maybeSingle<ExerciseDetail>();

  if (error) {
    return null;
  }
  if (!exercise) {
    notFound();
  }

  // 写真は非公開なので、本人用の期限つきURLをまとめて発行する
  const photoUrls = new Map<string, string>();
  if (exercise.exercise_photos.length > 0) {
    const { data: signedUrls } = await supabase.storage
      .from("exercise-photos")
      .createSignedUrls(
        exercise.exercise_photos.map((photo) => photo.path),
        PHOTO_URL_EXPIRES_IN,
      );
    signedUrls?.forEach(({ path, signedUrl }) => {
      if (path && signedUrl) {
        photoUrls.set(path, signedUrl);
      }
    });
  }

  return { exercise, photoUrls };
}
