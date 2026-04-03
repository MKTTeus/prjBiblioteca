import React from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import Sidebar from "../Sidebar/Sidebar";
import "./AppShell.css";

function AppShell({ children, sidebarType = "admin", activePage, setActivePage }) {
  const content = children ?? <Outlet />;

  return (
    <div className="layout">
      <Header />
      <Sidebar
        type={sidebarType}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main className="content">{content}</main>
    </div>
  );
}

export default AppShell;
