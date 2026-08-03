import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";

interface NavigationProps {
  open: boolean;
  onClose: () => void;
}

function readStudentName(): string | undefined {
  try {
    const raw = localStorage.getItem("schedule");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    return typeof parsed?.studentName === "string"
      ? parsed.studentName
      : undefined;
  } catch {
    return undefined;
  }
}

const expandedLabelClass =
  "whitespace-nowrap overflow-hidden transition-opacity duration-200 opacity-0 md:group-hover:opacity-100";
const expandedLabelOpenClass = "max-md:opacity-100";

export default function Navigation({ open, onClose }: NavigationProps) {
  const location = useLocation();
  const [studentName, setStudentName] = useState<string | undefined>(
    readStudentName
  );

  useEffect(() => {
    setStudentName(readStudentName());
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => setStudentName(readStudentName());
    window.addEventListener("schedule-updated", handler);
    return () => window.removeEventListener("schedule-updated", handler);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
    }
  };

  const navItems = [
    {
      name: "Pesquisar",
      path: "/",
      icon: (
        <svg xmlns="http://www.w000.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      ),
    },
    {
      name: "Grade",
      path: "/grade",
      icon: (
        <svg xmlns="http://www.w000.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      ),
    },
    {
      name: "Aviso",
      path: "/disclaimer",
      icon: (
        <svg xmlns="http://www.w000.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      ),
    }
  ];

  // Legal notice stays sidebar-only; the mobile tab bar only surfaces the two primary destinations.
  const mobileNavItems = navItems.filter((item) => item.path !== "/disclaimer");

  return (
    <>
      {/* Backdrop for the mobile tap-to-expand overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`group fixed top-0 left-0 h-screen bg-white border-gray-200 z-50 flex flex-col overflow-hidden transition-[width] duration-200 ease-in-out w-0 md:w-[4.5rem] md:border-r md:hover:w-64 ${
          open ? "max-md:w-64 max-md:border-r" : ""
        }`}
      >
        <nav className="flex-1 p-3 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#D44A61]/10 text-[#D44A61] font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span
                  className={`${expandedLabelClass} ${
                    open ? expandedLabelOpenClass : ""
                  }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-200 space-y-1 flex-shrink-0">
          {studentName && (
            <div
              className={`px-3 py-1 text-sm font-medium text-gray-700 truncate ${expandedLabelClass} ${
                open ? expandedLabelOpenClass : ""
              }`}
              title={studentName}
            >
              {studentName}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 w-full rounded-lg transition-colors"
          >
            <span className="flex-shrink-0">
              <svg xmlns="http://www.w000.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </span>
            <span className={`${expandedLabelClass} ${open ? expandedLabelOpenClass : ""}`}>
              Sair
            </span>
          </button>
        </div>
      </aside>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center p-2 pb-[env(safe-area-inset-bottom,0.5rem)] z-30">
        {mobileNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center p-2 rounded-lg ${
                isActive ? "text-[#D44A61]" : "text-gray-500"
              }`}
            >
              {item.icon}
              <span className="text-[10px] mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
