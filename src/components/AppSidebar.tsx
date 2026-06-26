import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, Calendar, ListTodo, CalendarCheck2, GanttChartSquare, ShieldAlert, Wallet,
  Repeat, Timer, ClipboardCheck, Focus,
  Users, Gauge, Mic, FileStack, Bell, Settings2, Workflow, Home,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  { labelKey: "sidebar.general", items: [
    { titleKey: "sidebar.dashboard", url: "/dashboard", icon: LayoutDashboard },
    { titleKey: "sidebar.calendar", url: "/calendario", icon: Calendar },
    { titleKey: "sidebar.activities", url: "/actividades", icon: ListTodo },
  ]},
  { labelKey: "sidebar.management", items: [
    { titleKey: "sidebar.gantt", url: "/gantt", icon: GanttChartSquare },
    { titleKey: "sidebar.risks", url: "/riesgos", icon: ShieldAlert },
    { titleKey: "sidebar.budget", url: "/presupuesto", icon: Wallet },
  ]},
  { labelKey: "sidebar.productivity", items: [
    { titleKey: "sidebar.habits", url: "/habitos", icon: Repeat },
    { titleKey: "sidebar.time", url: "/tiempo", icon: Timer },
    { titleKey: "sidebar.evaluation", url: "/evaluacion", icon: ClipboardCheck },
    { titleKey: "sidebar.focus", url: "/enfoque", icon: Focus },
  ]},
  { labelKey: "sidebar.collaboration", items: [
    { titleKey: "sidebar.team", url: "/equipo", icon: Users },
    { titleKey: "sidebar.load", url: "/carga", icon: Gauge },
    { titleKey: "sidebar.meetings", url: "/reuniones", icon: Mic },
  ]},
  { labelKey: "sidebar.planning", items: [
    { titleKey: "sidebar.templates", url: "/plantillas", icon: FileStack },
  ]},
  { labelKey: "sidebar.automation", items: [
    { titleKey: "sidebar.reminders", url: "/recordatorios", icon: Bell },
    { titleKey: "sidebar.autostates", url: "/auto-estados", icon: Settings2 },
    { titleKey: "sidebar.rules", url: "/reglas", icon: Workflow },
  ]},
];

export function AppSidebar() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className="flex items-center gap-2 px-2 py-3 hover:opacity-80 transition-opacity" aria-label={t("common.home")}>
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-none">Planeador</span>
            <span className="text-xs text-muted-foreground">{t("sidebar.activities")}</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.labelKey}>
            <SidebarGroupLabel>{t(g.labelKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={t(item.titleKey)}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{t(item.titleKey)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={t("sidebar.home")}>
              <Link to="/">
                <Home />
                <span>{t("sidebar.home")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
