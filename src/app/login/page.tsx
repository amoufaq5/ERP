"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useTranslation, I18nProvider } from "@/lib/i18n/i18n-context";

const DEMO_CREDENTIALS = [
  { username: "admin", password: "admin123", userId: "admin-001" },
  { username: "bum", password: "bum123", userId: "bum-001" },
  { username: "dm", password: "dm123", userId: "dm-001" },
  { username: "marketeer", password: "mkt123", userId: "mkt-001" },
  { username: "medrep", password: "rep123", userId: "rep-001" },
  { username: "accountant", password: "acc123", userId: "acc-001" },
  { username: "warehouse", password: "wh123", userId: "wh-001" },
  { username: "hr", password: "hr123", userId: "hr-001" },
];

// Map login usernames to the DEMO_USERS objects from user-context
const USER_PROFILES: Record<string, { id: string; name: string; email: string; role: string; department: string; territory?: string }> = {
  "admin-001": { id: "u-admin", name: "System Administrator", email: "admin@pharma.com", role: "ADMIN", department: "IT" },
  "bum-001": { id: "u-bum", name: "Dr. Hossam Tarek", email: "hossam@pharma.com", role: "BUM", department: "Executive" },
  "dm-001": { id: "u-dm-1", name: "Ahmed Mostafa", email: "ahmed.m@pharma.com", role: "DISTRICT_MANAGER", department: "Sales", territory: "Cairo North" },
  "mkt-001": { id: "u-mkt-1", name: "Dr. Yasmin Salem", email: "yasmin@pharma.com", role: "MARKETEER", department: "Marketing", territory: "North Region" },
  "rep-001": { id: "u-rep-1", name: "Mohamed El-Sayed", email: "mohamed@pharma.com", role: "MEDICAL_REP", department: "Sales", territory: "Giza" },
  "acc-001": { id: "u-acc-1", name: "Fatima El-Masry", email: "fatima@pharma.com", role: "ACCOUNTANT", department: "Finance" },
  "wh-001": { id: "u-wh-1", name: "Khaled Farouk", email: "khaled@pharma.com", role: "WAREHOUSE", department: "Warehouse" },
  "hr-001": { id: "u-hr-1", name: "Laila Abdel-Rahman", email: "laila@pharma.com", role: "HR", department: "Human Resources" },
};

export default function LoginPage() {
  return (
    <I18nProvider>
      <LoginPageInner />
    </I18nProvider>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const { t } = useTranslation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Always clear stale auth on login page to prevent redirect loops
    const params = new URLSearchParams(window.location.search);
    if (params.get("logout") === "1" || params.get("clear") === "1") {
      localStorage.removeItem("token");
      localStorage.removeItem("pharma.currentUser");
      window.history.replaceState({}, "", "/login");
      return;
    }
    // If already logged in, redirect to dashboard
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  function fillCredentials(user: string, pass: string) {
    setUsername(user);
    setPassword(pass);
    setError("");
  }

  function quickLogin(cred: typeof DEMO_CREDENTIALS[0]) {
    setError("");
    setIsLoading(true);
    const profile = USER_PROFILES[cred.userId];
    if (profile) {
      localStorage.setItem("pharma.currentUser", JSON.stringify(profile));
    }
    localStorage.setItem("token", `demo-token-${cred.userId}-${Date.now()}`);
    router.push("/dashboard");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const trimUser = username.trim();
    const trimPass = password.trim();

    setTimeout(() => {
      // 1. Check hardcoded demo credentials
      const matched = DEMO_CREDENTIALS.find(
        (cred) => cred.username === trimUser && cred.password === trimPass
      );

      if (matched) {
        const profile = USER_PROFILES[matched.userId];
        if (profile) {
          localStorage.setItem("pharma.currentUser", JSON.stringify(profile));
        }
        localStorage.setItem("token", `demo-token-${matched.userId}-${Date.now()}`);
        setIsLoading(false);
        router.push("/dashboard");
        return;
      }

      // 2. Check dynamically created user credentials
      try {
        const credsRaw = localStorage.getItem("pharma.credentials") || "{}";
        const creds: Record<string, { username: string; password: string }> = JSON.parse(credsRaw);
        const usersRaw = localStorage.getItem("pharma.allUsers");
        const allUsers = usersRaw ? JSON.parse(usersRaw) : [];

        const matchedEntry = Object.entries(creds).find(
          ([, c]) => c.username === trimUser && c.password === trimPass
        );

        if (matchedEntry) {
          const [userId] = matchedEntry;
          const userProfile = allUsers.find((u: { id: string }) => u.id === userId);
          if (userProfile) {
            localStorage.setItem("pharma.currentUser", JSON.stringify(userProfile));
            localStorage.setItem("token", `demo-token-${userId}-${Date.now()}`);
            setIsLoading(false);
            router.push("/dashboard");
            return;
          }
        }
      } catch { /* ignore parse errors */ }

      setError("Invalid username or password. Please try again.");
      setIsLoading(false);
    }, 600);
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4 py-12">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div
        className="relative w-full max-w-md transition-all duration-700 ease-out"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(16px)",
        }}
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Header / Branding */}
          <div className="bg-gradient-to-r from-slate-800 to-blue-800 px-8 py-8 text-white text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 ring-2 ring-white/20">
                <Building className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{t("login.title")}</h1>
            <p className="text-blue-200 text-sm mt-1.5 font-medium tracking-widest uppercase">
              ERP &middot; CRM &middot; ATS
            </p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">{t("login.welcomeBack")}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign in to your account to continue
              </p>
            </div>

            {error && (
              <div className="mb-5 flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <div className="shrink-0 mt-0.5">
                  <div className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                </div>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700"
                >
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.enterUsername")}
                    className="block w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                               transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.enterPassword")}
                    className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-900 placeholder-gray-400
                               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white
                               transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">{t("login.rememberMe")}</span>
                </label>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed
                           text-white font-semibold py-2.5 px-4 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                           transition-colors shadow-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  t("login.signIn")
                )}
              </button>
            </form>

            {/* Quick login — click any role to sign in instantly */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-3">
                Quick Login <span className="text-gray-400">(click any role to sign in instantly)</span>:
              </p>

              {/* Prominent admin quick-login */}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => quickLogin(DEMO_CREDENTIALS[0])}
                className="w-full mb-3 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400
                           text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
              >
                Sign in as Admin (Full Access)
              </button>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                {DEMO_CREDENTIALS.slice(1).map((cred) => (
                  <button
                    key={cred.username}
                    type="button"
                    disabled={isLoading}
                    onClick={() => quickLogin(cred)}
                    className="text-left text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded px-1.5 py-1 transition-colors cursor-pointer"
                  >
                    {cred.username} / {cred.password}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400/70 text-xs mt-6">
          &copy; {new Date().getFullYear()} Enterprise Suite. All rights reserved.
        </p>
      </div>
    </div>
  );
}
