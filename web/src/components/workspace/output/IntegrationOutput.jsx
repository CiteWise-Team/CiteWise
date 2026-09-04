import { useEffect, useState } from "react";
import { CircleCheck, CircleHelp, LoaderCircle, RefreshCw } from "lucide-react";
import { useGroup } from "../../../context/GroupContext.jsx";
import { getIntegrationImportsByWorkspaceAPI } from "../../../api/catalyst2.api.js";

const statusColors = {
  pending: "#e0a32e",
  processing: "#a5b4fc",
  completed: "#3ecf8e",
  failed: "#e5544b",
  cancelled: "#a1a1b5",
};

export default function IntegrationOutput({ result }) {
  const { groupId } = useGroup();
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function loadImports() {
    if (!groupId) return;
    setLoading(true);
    try {
      const response = await getIntegrationImportsByWorkspaceAPI(groupId);
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
      setImports(data);
      setSelectedId((current) => result?.id || current || data[0]?.id || null);
    } catch (error) {
      console.error("Could not load integration imports:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadImports(); }, [groupId, result]);

  const active = imports.find((item) => item.id === selectedId) || result;

  return (
    <div className="h-100 d-flex flex-column rounded-4 p-3" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55", color: "#e4e4f0", minHeight: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-0 text-white">Integration status</h5>
          <small style={{ color: "#a1a1b5" }}>Catalyst 2 import records for this workspace.</small>
        </div>
        <button type="button" title="Refresh imports" aria-label="Refresh imports" onClick={loadImports} className="btn btn-sm" style={{ color: "#a5b4fc", border: "1px solid #3a3a55" }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="d-flex gap-3 flex-grow-1" style={{ minHeight: 0 }}>
        <div style={{ width: "42%", maxWidth: 250, overflowY: "auto", borderRight: "1px solid #3a3a55", paddingRight: 12 }}>
          {loading && <div style={{ color: "#a1a1b5" }}>Loading imports...</div>}
          {!loading && imports.length === 0 && <div className="text-center mt-4"><CircleHelp size={24} color="#777792" /><p className="small mt-2" style={{ color: "#a1a1b5" }}>No imports prepared yet.</p></div>}
          {imports.map((item) => (
            <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} className="w-100 text-start p-2 mb-2 rounded-3" style={{ backgroundColor: selectedId === item.id ? "#303064" : "#25253a", border: `1px solid ${selectedId === item.id ? "#5b5bd6" : "#3a3a55"}`, color: "#e4e4f0" }}>
              <span className="d-block small text-truncate">{item.import_type}</span>
              <span style={{ color: statusColors[item.status] || "#a1a1b5", fontSize: 12 }}>{item.status}</span>
            </button>
          ))}
        </div>

        <div className="flex-grow-1" style={{ overflowY: "auto" }}>
          {active ? (
            <>
              <div className="d-flex align-items-center gap-2 mb-3"><CircleCheck size={20} color={statusColors[active.status] || "#a1a1b5"} /><h4 className="fw-bold mb-0 text-white">{active.import_type || "Integration import"}</h4></div>
              <div className="p-3 rounded-3" style={{ backgroundColor: "#25253a", border: "1px solid #3a3a55" }}>
                <div className="small mb-2" style={{ color: "#a1a1b5" }}>Status</div>
                <strong style={{ color: statusColors[active.status] || "#e4e4f0" }}>{active.status || "pending"}</strong>
                <div className="small mt-3" style={{ color: "#a1a1b5" }}>Import ID</div>
                <div className="small text-break">{active.id}</div>
              </div>
            </>
          ) : <p style={{ color: "#a1a1b5" }}>Prepare an integration to see its status here.</p>}
        </div>
      </div>
    </div>
  );
}
