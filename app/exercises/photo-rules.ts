// 写真のきまり（入力フォームと保存の処理で同じ値を使う）
export const MAX_PHOTOS = 5;
// 5枚で 3.5MB。送れる上限（next.config.ts の 4MB）に収まるようにする
export const PHOTO_MAX_BYTES = 700 * 1024;
export const CAPTION_MAX_LENGTH = 50;
// 写真の番号（入れた順）
export const PHOTO_NUMBERS = ["①", "②", "③", "④", "⑤"];
