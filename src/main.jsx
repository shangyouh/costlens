import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import CostLensV3 from "../costlens_v3.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <CostLensV3 />
  </StrictMode>
);
