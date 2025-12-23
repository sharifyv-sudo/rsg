import "@/App.css";
import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, FileText, Briefcase, CalendarCheck } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Payslips from "@/pages/Payslips";
import Contracts from "@/pages/Contracts";
import Jobs from "@/pages/Jobs";

const Sidebar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/jobs", icon: CalendarCheck, label: "Jobs" },
    { path: "/contracts", icon: Briefcase, label: "Contracts" },
    { path: "/employees", icon: Users, label: "Employees" },
    { path: "/payslips", icon: FileText, label: "Payslips" },
  ];

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-border flex flex-col" data-testid="sidebar">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_payroll-gbp/artifacts/3i59dflc_Picture1.jpg" 
            alt="Right Service Group Logo" 
            className="w-12 h-12 object-contain"
          />
          <div>
            <h1 className="font-heading font-bold text-base text-foreground tracking-tight leading-tight">Right Service Group</h1>
            <p className="text-xs text-muted-foreground">Payroll System</p>
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
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/contracts" element={<Contracts />} />
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
