import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Mail, AlertCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });

      if (response.data.success) {
        // Store auth token
        localStorage.setItem("rsg_auth_token", response.data.token);
        localStorage.setItem("rsg_auth_email", email);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E0F2FE] to-[#F8FAFC] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg" data-testid="login-card">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_payroll-gbp/artifacts/3i59dflc_Picture1.jpg" 
              alt="Right Service Group Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <CardTitle className="font-heading text-2xl font-bold text-[#0F64A8]">
            Right Service Group
          </CardTitle>
          <p className="text-sm text-muted-foreground">Payroll Management System</p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm" data-testid="login-error">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="pl-10"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="pl-10"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#0F64A8] hover:bg-[#0D5590] text-white"
              disabled={loading}
              data-testid="login-submit-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Secure access for authorized personnel only
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
