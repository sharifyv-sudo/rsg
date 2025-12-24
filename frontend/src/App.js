import "@/App.css";
import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LayoutDashboard, Users, FileText, Briefcase, CalendarCheck, LogOut } from "lucide-react";
import Dashboard from "@/pages/Dashboard";
import Employees from "@/pages/Employees";
import Payslips from "@/pages/Payslips";
import Contracts from "@/pages/Contracts";
import Jobs from "@/pages/Jobs";
import Login from "@/pages/Login";
import { Button } from "@/components/ui/button";

const Sidebar = ({ onLogout }) => {
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
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={onLogout}
          data-testid="logout-btn"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          © 2025 Right Service Group
        </p>
      </div>
    </aside>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem("rsg_auth_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("rsg_auth_token");
    localStorage.removeItem("rsg_auth_email");
    setIsAuthenticated(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login onLoginSuccess={handleLoginSuccess} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-background">
        <Sidebar onLogout={handleLogout} />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/payslips" element={<Payslips />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-right" />
    </BrowserRouter>
  );
}

export default App;
