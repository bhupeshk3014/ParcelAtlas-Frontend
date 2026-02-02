import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleAuthCallback } from "../lib/auth";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in...");
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get("error");
    const code = url.searchParams.get("code");

    if (err) {
      setMsg(`Login failed: ${err}`);
      return;
    }
    if (!code) {
      setMsg("Missing code in callback");
      return;
    }

    handleAuthCallback(code)
      .then(() => navigate("/", { replace: true }))
      .catch((e) => setMsg(e.message || "Login failed"));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-gray-700">
      {msg}
    </div>
  );
}
