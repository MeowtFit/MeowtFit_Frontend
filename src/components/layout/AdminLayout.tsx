import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f7f5f2]">
      <Sidebar />

      <main className="min-h-screen pl-[235px]">
        <Outlet />
      </main>
    </div>
  );
}