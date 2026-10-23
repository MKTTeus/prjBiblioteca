import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import NoviChat from "../NoviChat/NoviChat";
import "./AppShell.css";
import { useSidebar } from "../../contexts/SidebarContext";

function AppShell({ children, sidebarType = "admin", activePage, setActivePage }) {
  const content = children ?? <Outlet />;
  const { isCollapsed } = useSidebar();

  return (
    <div className={`layout ${sidebarType === "admin" ? `admin-shell${isCollapsed ? " admin-shell--collapsed" : ""}` : ""}`}>
      <Header sidebarType={sidebarType} />
      <Sidebar
        type={sidebarType}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="content">{content}</main>
      {sidebarType === "admin" && <NoviChat />}
    </div>
  );
}

export default AppShell;
