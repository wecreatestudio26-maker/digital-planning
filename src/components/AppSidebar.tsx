import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Calendar, ListTodo, CalendarCheck2, GanttChartSquare, ShieldAlert, Wallet,
  Repeat, Timer, ClipboardCheck, Focus,
  Users, Gauge, Mic, FileStack, Bell, Settings2, Workflow,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  { label: "General", items: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Calendario", url: "/calendario", icon: Calendar },
    { title: "Actividades", url: "/actividades", icon: ListTodo },
  ]},
  { label: "Gestión", items: [
    { title: "Gantt", url: "/gantt", icon: GanttChartSquare },
    { title: "Riesgos", url: "/riesgos", icon: ShieldAlert },
    { title: "Presupuesto", url: "/presupuesto", icon: Wallet },
  ]},
  { label: "Productividad", items: [
    { title: "Hábitos", url: "/habitos", icon: Repeat },
    { title: "Tiempo", url: "/tiempo", icon: Timer },
    { title: "Evaluación", url: "/evaluacion", icon: ClipboardCheck },
    { title: "Enfoque", url: "/enfoque", icon: Focus },
  ]},
  { label: "Colaboración", items: [
    { title: "Equipo", url: "/equipo", icon: Users },
    { title: "Carga", url: "/carga", icon: Gauge },
    { title: "Reuniones", url: "/reuniones", icon: Mic },
  ]},
  { label: "Planificación", items: [
    { title: "Plantillas", url: "/plantillas", icon: FileStack },
  ]},
  { label: "Automatización", items: [
    { title: "Recordatorios", url: "/recordatorios", icon: Bell },
    { title: "Auto-estados", url: "/auto-estados", icon: Settings2 },
    { title: "Reglas", url: "/reglas", icon: Workflow },
  ]},
];

export function AppSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarCheck2 className="h-4 w-4" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold leading-none">Planeador</span>
            <span className="text-xs text-muted-foreground">de Actividades</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
