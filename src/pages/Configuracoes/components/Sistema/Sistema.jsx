import Select from "react-select";
import { FiSettings } from "react-icons/fi";
import "./Sistema.css";

export default function Sistema() {
  const temaOptions = [
    { value: "Claro", label: "Claro" },
    { value: "Escuro", label: "Escuro" },
  ];

  const idiomaOptions = [
    { value: "pt-br", label: "Português (Brasil)" },
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
  ];

  const fusoOptions = [
    { value: "sp", label: "São Paulo (GMT-3)" },
    { value: "lisboa", label: "Lisboa (GMT+0)" },
    { value: "ny", label: "New York (GMT-5)" },
  ];

  const backupOptions = [
    { value: "diario", label: "Diário" },
    { value: "semanal", label: "Semanal" },
    { value: "mensal", label: "Mensal" },
  ];

  const customStyles = {
    control: (base) => ({
      ...base,
      backgroundColor: "#f3f4f6",
      border: "1px solid #e5e7eb",
      borderRadius: "8px",
      padding: "2px",
      boxShadow: "none",
      "&:hover": {
        borderColor: "#111827",
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "10px",
      overflow: "hidden",
      animation: "fadeIn 0.15s ease-in-out",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? "#e5e7eb" : "white",
      color: "#111827",
      padding: "10px",
      cursor: "pointer",
    }),
  };

  return (
    <div className="card">
      <div className="sistema-header">
        <FiSettings className="sistema-icon" />
        <h3>Configurações do Sistema</h3>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label>Tema</label>
          <Select
            options={temaOptions}
            defaultValue={temaOptions[0]}
            styles={customStyles}
          />
        </div>

        <div className="form-group">
          <label>Idioma</label>
          <Select
            options={idiomaOptions}
            defaultValue={idiomaOptions[0]}
            styles={customStyles}
          />
        </div>

        <div className="form-group">
          <label>Fuso Horário</label>
          <Select
            options={fusoOptions}
            defaultValue={fusoOptions[0]}
            styles={customStyles}
          />
        </div>

        <div className="form-group">
          <label>Frequência de Backup</label>
          <Select
            options={backupOptions}
            defaultValue={backupOptions[0]}
            styles={customStyles}
          />
        </div>
      </div>

      <div className="card-actions">
        <button className="btn-secondary">
          Restaurar Padrão
        </button>

        <button className="btn-dark">
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}