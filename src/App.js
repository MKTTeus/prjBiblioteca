import React from "react";
import Sidebar from "./components/Sidebar/Sidebar";
import Header from "./components/Header/Header";

function App() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        width: "100%",
        overflowX: "hidden", // impede rolagem lateral
        overflowY: "auto", // permite rolagem vertical
      }}
    >
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Header />
        <main
          style={{
            padding: "2rem",
            flex: 1,
            backgroundColor: "#f9fafb",
          }}
        >
          <h1 style={{ fontWeight: "bold" }}>Conteúdo principal aqui</h1>
        </main>
      </div>
    </div>
  );
}

export default App;
