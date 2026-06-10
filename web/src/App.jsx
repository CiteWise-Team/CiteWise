import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Groups from "./pages/Groups";
import Upload from "./pages/Upload";
import ProtectedRoute from "./routes/ProtectedRoute";
import GroupWorkflow from "./pages/Workspace";
import CiteWiseApp from "./citewise/App";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const {user} = useAuth();
  // TEMP: simulate auth (replace later)
  const isAuthenticated = false;

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
        <Route path="/workspace/:groupName" element={
          <ProtectedRoute>
            <GroupWorkflow />
          </ProtectedRoute>
        } />

        {/* CiteWise flow — keyed per workspace so each group keeps its own session */}
        <Route path="/citewise/:groupId" element={<CiteWiseApp />} />
        {/* <Route path="/workspace/workflow" element={
          <ProtectedRoute>
            <GroupWorkflow />
          </ProtectedRoute>
        } /> */}
      </Routes>
    </BrowserRouter>
  );
}
