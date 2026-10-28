import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "ログイン｜リハビリ運動ノート",
};

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-6 py-12 text-lg">
      <h1 className="text-center text-3xl font-bold">リハビリ運動ノート</h1>
      <LoginForm />
    </main>
  );
}
