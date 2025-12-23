import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, FileText, PoundSterling } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Payslips from "@/pages/Payslips";

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/employees", icon: Users, label: "Employees" },
    { path: "/payslips", icon: FileText, label: "Payslips" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md bg-emerald-500 flex items-center justify-center">
            <PoundSterling className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-foreground tracking-tight">Right Service Group</h1>
            <p className="text-xs text-muted-foreground">British Pound (£)</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-1" data-testid="navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      
      <div className="p-4 border-t border-border">
        <p className="text-xs text-muted-foreground text-center">
          © 2025 Right Service Group
        </p>
      </div>
    </aside>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payslips" element={<Payslips />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
