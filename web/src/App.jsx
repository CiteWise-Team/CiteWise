import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Groups from "./pages/Groups";
import Upload from "./pages/Upload";
import ProtectedRoute from "./routes/ProtectedRoute";
import GroupWorkflow from "./pages/Workspace";
import CiteWiseApp from "./citewise/App";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route
          path="/groups"
          element={
            <ProtectedRoute>
              <Groups />
            </ProtectedRoute>
          }
        />

        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspace/:groupName"
          element={
            <ProtectedRoute>
              <GroupWorkflow />
            </ProtectedRoute>
          }
        />

        {/* CiteWise flow — protected so direct URL access redirects to login */}
        <Route
          path="/citewise/:groupId"
          element={
            <ProtectedRoute>
              <CiteWiseApp />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

