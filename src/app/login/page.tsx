"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Building, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useTranslation, I18nProvider } from "@/lib/i18n/i18n-context";

const DEMO_CREDENTIALS = [
  { username: "admin", password: "admin123", label: "Admin (Full Access)", role: "ADMIN" },
  { username: "nsm", password: "nsm123", label: "National Sales Manager", role: "NSM" },
  { username: "bum", password: "bum123", label: "Business Unit Manager", role: "BUM" },
  { username: "marketeer", password: "mkt123", label: "Marketeer", role: "MARKETEER" },
  { username: "dm", password: "dm123", label: "District Manager", role: "DISTRICT_MANAGER" },
  { username: "medrep", password: "rep123", label: "Medical Rep", role: "MEDICAL_REP" },
  { username: "accountant", password: "acc123", label: "Accountant", role: "ACCOUNTANT" },
  { username: "warehouse", password: "wh123", label: "Warehouse", role: "WAREHOUSE" },
  { username: "hr", password: "hr123", label: "HR Manager", role: "HR" },
];

export default function LoginPage() {
  return (
    <I18nProvider>
      <LoginPageInner />
    </I18nProvider>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [showDemoHints, setShowDemoHints] = useState(false);
  const hiddenFormRef = useRef<HTMLFormElement>(null);
  const hiddenUserRef = useRef<HTMLInputElement>(null);
  const hiddenPassRef = useRef<HTMLInputElement>(null);
  const hiddenCallbackRef = useRef<HTMLInputElement>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const authError = searchParams.get("error");

  useEffect(() => {
    setMounted(true);
    if (authError === "CredentialsSignin") {
      setError(t("login.invalidCredentials"));
    }
  }, [authError, t]);

  function fillCredentials(user: string, pass: string) {
    setUsername(user);
    setPassword(pass);
    setError("");
  }

  function submitViaForm(user: string, pass: string) {
    if (hiddenUserRef.current) hiddenUserRef.current.value = user;
    if (hiddenPassRef.current) hiddenPassRef.current.value = pass;
    if (hiddenCallbackRef.current) hiddenCallbackRef.current.value = callbackUrl;
    setIsLoading(true);
    setError("");
    hiddenFormRef.current?.submit();
  }

  function quickLogin(cred: (typeof DEMO_CREDENTIALS)[0]) {
    submitViaForm(cred.username, cred.password);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimUser = username.trim();
    const trimPass = password.trim();
    if (!trimUser || !trimPass) {
      setError("Username and password are required.");
      return;
    }
    submitViaForm(trimUser, trimPass);
  }

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-4 py-12">
      {/* Hidden form that does a real browser POST — no JS fetch */}
      <form
        ref={hiddenFormRef}
        method="POST"
        action="/api/auth/direct-login"
        style={{ display: "none" }}
      >
        <input ref={hiddenUserRef} type="hidden" name="username" />
        <input ref={hiddenPassRef} type="hidden" name="password" />
        <input ref={hiddenCallbackRef} type="hidden" name="callbackUrl" value={callbackUrl} />
      </form>

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
                    aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
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

            {/* Demo credentials hint section (collapsible) */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowDemoHints(!showDemoHints)}
                className="w-full flex items-center justify-between text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
              >
                <span>Demo Credentials <span className="text-gray-400">(development only)</span></span>
                {showDemoHints ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showDemoHints && (
                <div className="mt-3 space-y-2">
                  {/* Prominent admin quick-login */}
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => quickLogin(DEMO_CREDENTIALS[0])}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400
                               text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors shadow-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Sign in as Admin (Full Access)
                  </button>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
                    {DEMO_CREDENTIALS.slice(1).map((cred) => (
                      <button
                        key={cred.username}
                        type="button"
                        disabled={isLoading}
                        onClick={() => fillCredentials(cred.username, cred.password)}
                        className="text-left text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded px-1.5 py-1 transition-colors cursor-pointer"
                        title={`Click to fill: ${cred.username} / ${cred.password}`}
                      >
                        {cred.username} / {cred.password}
                      </button>
                    ))}
                  </div>
                </div>
              )}
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
