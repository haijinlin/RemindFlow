import Image from "next/image";
import { login } from "@/app/login/actions";

type LoginSearchParams = {
  from?: string;
  error?: string;
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<LoginSearchParams>;
}) {
  const params = await searchParams;
  const from = params?.from ?? "/";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <form
        action={login}
        className="w-full max-w-sm rounded-md border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="from" value={from} />
        <div className="flex items-center gap-3">
          <Image
            src="/icons/icon.svg"
            alt="RemindFlow"
            width={44}
            height={44}
            priority
            className="h-11 w-11 rounded-md"
          />
          <div>
            <h1 className="text-xl font-semibold text-slate-950">RemindFlow</h1>
            <p className="text-sm text-slate-500">Sign in to continue</p>
          </div>
        </div>

        {params?.error === "config" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Login is not configured. Set REMINDFLOW_APP_PASSWORD and AUTH_SECRET.
          </div>
        ) : null}
        {params?.error === "invalid" ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            Password is incorrect.
          </div>
        ) : null}

        <label className="mt-5 block text-sm font-medium text-slate-700">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-500"
            required
          />
        </label>
        <button className="mt-4 h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
          Sign in
        </button>
      </form>
    </main>
  );
}
