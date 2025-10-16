import React from "react";
import Sidebar from "./components/Sidebar/Sidebar";

function App() {
  return (
    <div style={{ display: "flex" }}>
      <Sidebar />
      <main style={{ padding: "2rem", flex: 1 }}>
        <h1>Conteúdo principal aqui</h1>
      </main>
    </div>
  );
}

export default App;
