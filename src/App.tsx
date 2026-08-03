import { useState } from "react";
import { Routes, Route, BrowserRouter, Outlet } from "react-router";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Schedule from "./pages/Schedule";
import Disclaimer from "./pages/Disclaimer";
import Header from "./components/Header";
import Navigation from "./components/Navigation";

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="bg-[#f8f8f8] min-h-dvh flex flex-col md:flex-row pb-16 md:pb-0">
      <Navigation open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="flex-1 min-w-0 flex flex-col md:ml-[4.5rem]">
        <div className="md:hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} />
        </div>
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/grade" element={<Schedule />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
