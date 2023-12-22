import React from "react";
import ReactDOM from "react-dom/client";
import "./assets/main.css";
import App from "./App";
import { AuthProvider } from "./components/Context";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
      <ToastContainer />
    </AuthProvider>
  </React.StrictMode>
);
