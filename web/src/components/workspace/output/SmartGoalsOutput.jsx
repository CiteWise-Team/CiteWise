import { useEffect, useState } from "react";
import { Target, RefreshCw, CircleHelp } from "lucide-react";
import { useGroup } from "../../../context/GroupContext.jsx";
import { getSmartObjectivesByWorkspaceAPI } from "../../../api/smartGoals.api.js";

const statusColors = { draft: "#e0a32e", active: "#3ecf8e", archived: "#a1a1b5" };

export default function SmartGoalsOutput({ result }) {
  const { groupId } = useGroup();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  async function loadData() {
    if (!groupId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getSmartObjectivesByWorkspaceAPI(groupId);
      setItems(Array.isArray(data) ? data : []);
      if (!selectedId && data?.length) setSelectedId(data[0].id);
    } catch (error) {
      console.warn("Load SMART outputs failed:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [groupId, result]);

  const active = items.find((item) => item.id === selectedId) || result || null;

  return (
    <div className="h-100 d-flex flex-column rounded-4 p-3" style={{ backgroundColor: "#1e1e2f", border: "1px solid #3a3a55", color: "#e4e4f0", minHeight: 0 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="fw-bold mb-0 text-white">SMART goals</h5>
          <small style={{ color: "#a1a1b5" }}>Workspace objective tracker</small>
        </div>
        <button type="button" aria-label="Refresh SMART goals" onClick={loadData} className="btn btn-sm" style={{ color: "#a5b4fc", border: "1px solid #3a3a55" }}>
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      <div className="d-flex gap-3 flex-grow-1" style={{ minHeight: 0 }}>
        <div style={{ width: "42%", maxWidth: 260, overflowY: "auto", borderRight: "1px solid #3a3a55", paddingRight: 12 }}>
          {loading && <div style={{ color: "#a1a1b5" }}>Loading goals...</div>}
          {!loading && items.length === 0 && (
            <div className="text-center mt-4">
              <CircleHelp size={24} color="#777792" />
              <p className="small mt-2" style={{ color: "#a1a1b5" }}>No SMART goals yet.</p>
            </div>
          )}
          {items.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelectedId(item.id)} className="w-100 text-start p-2 mb-2 rounded-3" style={{ backgroundColor: selectedId === item.id ? "#303064" : "#25253a", border: `1px solid ${selectedId === item.id ? "#5b5bd6" : "#3a3a55"}`, color: "#e4e4f0" }}>
              <span className="d-block small text-truncate">{item.objective_type || "objective"}</span>
              <span style={{ color: statusColors[item.status] || "#a1a1b5", fontSize: 12 }}>{item.status || "draft"}</span>
            </button>
          ))}
        </div>

        <div className="flex-grow-1" style={{ overflowY: "auto" }}>
          {active ? (
            <>
              <div className="d-flex align-items-center gap-2 mb-3"><Target size={20} color={statusColors[active.status] || "#a1a1b5"} /><h4 className="fw-bold mb-0 text-white">{active.objective_type || "SMART goal"}</h4></div>
              <div className="p-3 rounded-3" style={{ backgroundColor: "#25253a", border: "1px solid #3a3a55" }}>
                <div className="small mb-2" style={{ color: "#a1a1b5" }}>Objective</div>
                <div className="text-white mb-3">{active.objective_text || "Untitled objective"}</div>
                <div className="small mb-1" style={{ color: "#a1a1b5" }}>Priority</div>
                <div className="mb-2">{active.priority || "medium"}</div>
                <div className="small mb-1" style={{ color: "#a1a1b5" }}>Status</div>
                <div><strong style={{ color: statusColors[active.status] || "#e4e4f0" }}>{active.status || "draft"}</strong></div>
                <div className="small mt-3" style={{ color: "#a1a1b5" }}>Version</div>
                <div>{active.version_number || 1}</div>
                {active.gap_text && <><div className="small mt-3" style={{ color: "#a1a1b5" }}>Gap</div><div>{active.gap_text}</div></>}
                {active.topic_text && <><div className="small mt-3" style={{ color: "#a1a1b5" }}>Topic</div><div>{active.topic_text}</div></>}
              </div>
            </>
          ) : <p style={{ color: "#a1a1b5" }}>Create a SMART goal to see it here.</p>}
        </div>
      </div>
    </div>
  );
}
