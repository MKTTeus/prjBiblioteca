import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import NoviChat from "../NoviChat/NoviChat";
import NoviWelcome from "../NoviWelcome/NoviWelcome";
import "./AppShell.css";
import "./UserShell.css";
import { useSidebar } from "../../contexts/SidebarContext";

function AppShell({ children, sidebarType = "admin", activePage, setActivePage }) {
  const content = children ?? <Outlet />;
  const { isCollapsed } = useSidebar();
  const [showNoviWelcome, setShowNoviWelcome] = useState(() =>
    sidebarType === "admin" && sessionStorage.getItem("novi-welcome-pending") === "1"
  );

  useEffect(() => {
    if (showNoviWelcome) sessionStorage.removeItem("novi-welcome-pending");
  }, [showNoviWelcome]);

  return (
    <div className={`layout ${sidebarType === "admin" ? `admin-shell${isCollapsed ? " admin-shell--collapsed" : ""}` : sidebarType === "user" || sidebarType === "professor" ? `user-shell${isCollapsed ? " user-shell--collapsed" : ""}` : ""}`}>
      <Header sidebarType={sidebarType} />
      <Sidebar
        type={sidebarType}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="content">{content}</main>
      {sidebarType === "admin" && <NoviChat />}
      {sidebarType === "admin" && <NoviWelcome show={showNoviWelcome} onClose={() => setShowNoviWelcome(false)} />}
    </div>
  );
}

export default AppShell;
