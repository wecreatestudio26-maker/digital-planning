import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Calendar, ListTodo, CalendarCheck2, GanttChartSquare, ShieldAlert, Wallet, Target } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Calendario", url: "/calendario", icon: Calendar },
  { title: "Actividades", url: "/actividades", icon: ListTodo },
  { title: "Gantt", url: "/gantt", icon: GanttChartSquare },
  { title: "Riesgos", url: "/riesgos", icon: ShieldAlert },
  { title: "Presupuesto", url: "/presupuesto", icon: Wallet },
  { title: "OKR", url: "/okr", icon: Target },
  { title: "Actividades", url: "/actividades", icon: ListTodo },
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
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
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
      </SidebarContent>
    </Sidebar>
  );
}
