import { Link, useLocation } from "wouter";
import { Music, BarChart3, Settings, QrCode, List, Home } from "lucide-react";

interface SidebarProps {
  adminId: string;
}

export function Sidebar({ adminId }: SidebarProps) {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Dashboard",
      href: `/dashboard/${adminId}`,
      icon: Home,
    },
    {
      name: "My Playlists",
      href: `/dashboard/${adminId}/playlists`,
      icon: List,
    },
    {
      name: "QR Codes",
      href: `/dashboard/${adminId}/qr`,
      icon: QrCode,
    },
    {
      name: "Analytics",
      href: `/dashboard/${adminId}/analytics`,
      icon: BarChart3,
    },
    {
      name: "Settings",
      href: `/dashboard/${adminId}/settings`,
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0" data-testid="sidebar">
      <div className="flex flex-col flex-grow bg-slate-850 overflow-y-auto border-r border-slate-700">
        {/* Logo */}
        <div className="flex items-center flex-shrink-0 px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center">
              <Music className="text-white text-lg" />
            </div>
            <h1 className="text-xl font-bold text-gradient">QR Jukebox</h1>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 pb-4 space-y-2" data-testid="sidebar-nav">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className={`mr-3 w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-slate-700 p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 gradient-accent rounded-full flex items-center justify-center">
              <span className="text-xs font-semibold text-white">DJ</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate" data-testid="sidebar-user-name">
                Admin User
              </p>
              <p className="text-xs text-slate-400 truncate">Jukebox Owner</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
