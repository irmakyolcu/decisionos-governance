import {
  Home, Sparkles, Brain, GitBranch, Building2, FolderKanban, Workflow,
  Zap, AlertTriangle, Database, Users, Shield, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';

const navGroups: { label: string; items: { title: string; url: string; icon: any }[] }[] = [
  {
    label: 'Company Brain',
    items: [
      { title: 'Home', url: '/', icon: Home },
      { title: 'Ask DecisionOS', url: '/ask', icon: Sparkles },
      { title: 'Company Brain', url: '/brain', icon: Brain },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { title: 'Decisions', url: '/decisions', icon: GitBranch },
      { title: 'Clients', url: '/clients', icon: Building2 },
      { title: 'Projects', url: '/projects', icon: FolderKanban },
      { title: 'Processes', url: '/processes', icon: Workflow },
      { title: 'Company Skills', url: '/skills', icon: Zap },
      { title: 'Risks & Alerts', url: '/risks', icon: AlertTriangle },
    ],
  },
  {
    label: 'Admin',
    items: [
      { title: 'Data Sources', url: '/data-sources', icon: Database },
      { title: 'Team', url: '/team', icon: Users },
      { title: 'Admin & Permissions', url: '/admin', icon: Shield },
    ],
  },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-sidebar-accent-foreground tracking-wide">DecisionOS</h2>
              <p className="text-[10px] text-sidebar-muted">Company Brain</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest mb-1">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="h-9">
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-sm"
                        activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex items-center justify-center w-full h-8 rounded-md hover:bg-sidebar-accent text-sidebar-muted hover:text-sidebar-accent-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
