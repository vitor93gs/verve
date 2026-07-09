import Dashboard from "@/components/Dashboard";
import Login from "@/components/Login";
import { isAuthenticated } from "@/lib/auth";

export default function Home() {
  if (!isAuthenticated()) {
    return <Login />;
  }

  return <Dashboard />;
}
