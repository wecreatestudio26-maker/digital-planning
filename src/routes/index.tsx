import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Calendar,
  BarChart3,
  Repeat,
  Target,
  Users,
  ShieldCheck,
  Globe,
  ArrowRight,
} from "lucide-react";

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

type Lang = "es" | "en" | "fr" | "it";

const T: Record<Lang, {
  signIn: string;
  heroTitle: string;
  heroSubtitle: string;
  getStarted: string;
  features: { icon: string; title: string; desc: string }[];
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton: string;
  footer: string;
  tagline: string;
}> = {
  es: {
    signIn: "Iniciar sesión",
    heroTitle: "Organiza tu vida, define tus metas, alinea tu equipo",
    heroSubtitle:
      "Una plataforma completa para planificar actividades, gestionar proyectos y potenciar tu productividad personal y en equipo.",
    getStarted: "Empezar ahora",
    tagline: "Schedule · Define · Align",
    features: [
      { icon: "📅", title: "CALENDARIO & ACTIVIDADES", desc: "Organiza tus tareas diarias y visualiza todo tu mes de un vistazo." },
      { icon: "📊", title: "DIAGRAMA GANTT", desc: "Planifica proyectos con líneas de tiempo claras y control de avance." },
      { icon: "🔄", title: "HÁBITOS & TIEMPO", desc: "Registra tus hábitos diarios y controla en qué inviertes tu tiempo." },
      { icon: "🎯", title: "ENFOQUE & EVALUACIÓN", desc: "Mantén el foco en lo importante y evalúa tu productividad personal." },
      { icon: "👥", title: "COLABORACIÓN EN EQUIPO", desc: "Gestiona carga de trabajo, reuniones y tareas compartidas con tu equipo." },
      { icon: "🔒", title: "PRIVACIDAD & SEGURIDAD", desc: "Tus datos se guardan de forma segura en la nube. ¡Son solo tuyos!" },
    ],
    ctaTitle: "¿Listo para organizar tus actividades?",
    ctaSubtitle: "Crea tu cuenta gratis y empieza a planificar hoy mismo.",
    ctaButton: "Empezar ahora",
    footer: "✨ Hecho con ❤️ para organizar tus actividades · Datos sincronizados en la nube",
  },
  en: {
    signIn: "Sign in",
    heroTitle: "Organize your life, define your goals, align your team",
    heroSubtitle:
      "A complete platform to plan activities, manage projects, and boost your personal and team productivity.",
    getStarted: "Get started",
    tagline: "Schedule · Define · Align",
    features: [
      { icon: "📅", title: "CALENDAR & ACTIVITIES", desc: "Organize your daily tasks and see your entire month at a glance." },
      { icon: "📊", title: "GANTT CHART", desc: "Plan projects with clear timelines and progress tracking." },
      { icon: "🔄", title: "HABITS & TIME", desc: "Track your daily habits and control how you spend your time." },
      { icon: "🎯", title: "FOCUS & EVALUATION", desc: "Stay focused on what matters and evaluate your personal productivity." },
      { icon: "👥", title: "TEAM COLLABORATION", desc: "Manage workload, meetings, and shared tasks with your team." },
      { icon: "🔒", title: "PRIVACY & SECURITY", desc: "Your data is stored safely in the cloud. It's only yours!" },
    ],
    ctaTitle: "Ready to organize your activities?",
    ctaSubtitle: "Create your free account and start planning today.",
    ctaButton: "Get started",
    footer: "✨ Made with ❤️ to organize your activities · Data synced in the cloud",
  },
  fr: {
    signIn: "Se connecter",
    heroTitle: "Organisez votre vie, définissez vos objectifs, alignez votre équipe",
    heroSubtitle:
      "Une plateforme complète pour planifier vos activités, gérer vos projets et booster votre productivité personnelle et d'équipe.",
    getStarted: "Commencer",
    tagline: "Schedule · Define · Align",
    features: [
      { icon: "📅", title: "CALENDRIER & ACTIVITÉS", desc: "Organisez vos tâches quotidiennes et visualisez tout votre mois d'un coup d'œil." },
      { icon: "📊", title: "DIAGRAMME DE GANTT", desc: "Planifiez vos projets avec des chronologies claires et un suivi d'avancement." },
      { icon: "🔄", title: "HABITUDES & TEMPS", desc: "Enregistrez vos habitudes quotidiennes et contrôlez votre temps." },
      { icon: "🎯", title: "FOCUS & ÉVALUATION", desc: "Restez concentré sur l'essentiel et évaluez votre productivité personnelle." },
      { icon: "👥", title: "COLLABORATION D'ÉQUIPE", desc: "Gérez la charge de travail, les réunions et les tâches partagées avec votre équipe." },
      { icon: "🔒", title: "CONFIDENTIALITÉ & SÉCURITÉ", desc: "Vos données sont stockées en toute sécurité dans le cloud. Elles ne sont qu'à vous !" },
    ],
    ctaTitle: "Prêt à organiser vos activités ?",
    ctaSubtitle: "Créez votre compte gratuit et commencez à planifier dès aujourd'hui.",
    ctaButton: "Commencer",
    footer: "✨ Fait avec ❤️ pour organiser vos activités · Données synchronisées dans le cloud",
  },
  it: {
    signIn: "Accedi",
    heroTitle: "Organizza la tua vita, definisci i tuoi obiettivi, allinea il tuo team",
    heroSubtitle:
      "Una piattaforma completa per pianificare attività, gestire progetti e potenziare la tua produttività personale e di team.",
    getStarted: "Inizia ora",
    tagline: "Schedule · Define · Align",
    features: [
      { icon: "📅", title: "CALENDARIO & ATTIVITÀ", desc: "Organizza le tue attività quotidiane e visualizza tutto il mese in un colpo d'occhio." },
      { icon: "📊", title: "DIAGRAMMA DI GANTT", desc: "Pianifica progetti con tempistiche chiare e controllo dell'avanzamento." },
      { icon: "🔄", title: "ABITUDINI & TEMPO", desc: "Registra le tue abitudini quotidiane e controlla come usi il tempo." },
      { icon: "🎯", title: "FOCUS & VALUTAZIONE", desc: "Mantieni il focus su ciò che conta e valuta la tua produttività personale." },
      { icon: "👥", title: "COLLABORAZIONE DI TEAM", desc: "Gestisci carico di lavoro, riunioni e attività condivise con il tuo team." },
      { icon: "🔒", title: "PRIVACY & SICUREZZA", desc: "I tuoi dati sono salvati in sicurezza nel cloud. Sono solo tuoi!" },
    ],
    ctaTitle: "Pronto a organizzare le tue attività?",
    ctaSubtitle: "Crea il tuo account gratuito e inizia a pianificare oggi stesso.",
    ctaButton: "Inizia ora",
    footer: "✨ Fatto con ❤️ per organizzare le tue attività · Dati sincronizzati nel cloud",
  },
};

const ICONS = [Calendar, BarChart3, Repeat, Target, Users, ShieldCheck];
const ICON_COLORS = [
  "text-emerald-500 bg-emerald-50",
  "text-sky-500 bg-sky-50",
  "text-violet-500 bg-violet-50",
  "text-amber-500 bg-amber-50",
  "text-rose-500 bg-rose-50",
  "text-teal-500 bg-teal-50",
];

function Landing() {
  const [lang, setLang] = useState<Lang>("es");
  const t = T[lang];

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
              <div className="font-semibold text-slate-900 leading-tight">Planeador de Actividades</div>
              <div className="text-xs text-slate-500">{t.tagline}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative flex items-center">
              <Globe className="absolute left-2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
                className="appearance-none pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 cursor-pointer"
              >
                <option value="es">ES — Español</option>
                <option value="en">EN — English</option>
                <option value="fr">FR — Français</option>
                <option value="it">IT — Italiano</option>
              </select>
            </div>
            <Link
              to="/auth/login"
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              {t.signIn}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-tight">
          {t.heroTitle}
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">{t.heroSubtitle}</p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/auth/register"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
          >
            {t.getStarted} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/auth/login"
            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-medium hover:border-slate-300 transition-colors"
          >
            {t.signIn}
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.map((f, i) => {
            const Icon = ICONS[i];
            return (
              <div
                key={i}
                className="bg-white rounded-2xl p-6 border border-slate-200/70 hover:border-slate-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${ICON_COLORS[i]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-slate-900">
                      <span className="mr-1">{f.icon}</span>
                      {f.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
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
          <h2 className="text-3xl md:text-4xl font-bold">{t.ctaTitle}</h2>
          <p className="mt-3 text-white/90 text-lg">{t.ctaSubtitle}</p>
          <Link
            to="/auth/register"
            className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-600 font-semibold hover:bg-slate-50 transition-colors"
          >
            {t.ctaButton} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-sm text-slate-500 px-6">
        {t.footer}
      </footer>
    </div>
  );
}
