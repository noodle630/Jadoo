import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  PlusCircle, 
  LayoutTemplate, 
  History, 
  Settings,
  Database
} from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const isLinkActive = (path: string) => {
    if (path === "/" && location === path) return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  return (
    <aside className="bg-primary-700 text-white w-full md:w-64 md:min-h-screen flex-shrink-0">
      <div className="p-4 flex items-center">
        <Database className="h-6 w-6 mr-2" />
        <span className="text-xl font-semibold">DataFeedSync</span>
      </div>
      <nav className="py-4">
        <Link href="/">
          <a className={`flex items-center py-3 px-4 hover:bg-primary-600 transition ${isLinkActive("/") && !location.includes("/") ? "bg-primary-600" : ""}`}>
            <LayoutDashboard className="h-5 w-5 mr-3" />
            <span>Dashboard</span>
          </a>
        </Link>
        <Link href="/new-feed">
          <a className={`flex items-center py-3 px-4 hover:bg-primary-600 transition ${isLinkActive("/new-feed") ? "bg-primary-600" : ""}`}>
            <PlusCircle className="h-5 w-5 mr-3" />
            <span>New Feed</span>
          </a>
        </Link>
        <Link href="/templates">
          <a className={`flex items-center py-3 px-4 hover:bg-primary-600 transition ${isLinkActive("/templates") ? "bg-primary-600" : ""}`}>
            <LayoutTemplate className="h-5 w-5 mr-3" />
            <span>Templates</span>
          </a>
        </Link>
        <Link href="/history">
          <a className={`flex items-center py-3 px-4 hover:bg-primary-600 transition ${isLinkActive("/history") ? "bg-primary-600" : ""}`}>
            <History className="h-5 w-5 mr-3" />
            <span>History</span>
          </a>
        </Link>
        <Link href="/settings">
          <a className={`flex items-center py-3 px-4 hover:bg-primary-600 transition ${isLinkActive("/settings") ? "bg-primary-600" : ""}`}>
            <Settings className="h-5 w-5 mr-3" />
            <span>Settings</span>
          </a>
        </Link>
      </nav>
    </aside>
  );
}
