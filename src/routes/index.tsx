import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Calendar,
  BarChart3,
  Repeat,
  Target,
  Users,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Planeador de Actividades — Organiza tu vida y tu equipo" },
      {
        name: "description",
        content:
          "Plataforma completa para planificar actividades, gestionar proyectos y potenciar tu productividad personal y en equipo.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { key: "calendar", icon: Calendar, emoji: "📅", color: "text-emerald-500 bg-emerald-50" },
  { key: "gantt", icon: BarChart3, emoji: "📊", color: "text-sky-500 bg-sky-50" },
  { key: "habits", icon: Repeat, emoji: "🔄", color: "text-violet-500 bg-violet-50" },
  { key: "focus", icon: Target, emoji: "🎯", color: "text-amber-500 bg-amber-50" },
  { key: "team", icon: Users, emoji: "👥", color: "text-rose-500 bg-rose-50" },
  { key: "security", icon: ShieldCheck, emoji: "🔒", color: "text-teal-500 bg-teal-50" },
] as const;

function Landing() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white font-bold">
              P
            </div>
            <div>
              <div className="font-semibold text-slate-900 leading-tight">{t("common.appName")}</div>
              <div className="text-xs text-slate-500">{t("landing.tagline")}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              to="/auth/login"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              {t("common.signIn")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          {t("landing.heroTitle")}
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">{t("landing.heroSubtitle")}</p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
          >
            {t("landing.getStarted")} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth/login"
            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:border-slate-300 transition-colors"
          >
            {t("common.signIn")}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.key}
                className="bg-white rounded-2xl p-6 border border-slate-200/70 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${f.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-slate-900">
                      <span className="mr-1">{f.emoji}</span>
                      {t(`landing.features.${f.key}.title`)}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{t(`landing.features.${f.key}.desc`)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-sky-500 p-10 md:p-14 text-center text-white shadow-xl shadow-emerald-500/20">
          <h2 className="text-3xl md:text-4xl font-bold">{t("landing.ctaTitle")}</h2>
          <p className="mt-3 text-white/90 text-lg">{t("landing.ctaSubtitle")}</p>
          <Link
            to="/auth/register"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            {t("landing.ctaButton")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm text-slate-500 px-6">
        {t("landing.footer")}
      </footer>
    </div>
  );
}
