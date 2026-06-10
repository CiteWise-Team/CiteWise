import { useEffect, useState } from "react";
import { useGroup } from "../../../context/GroupContext";
import { getGapsByGroupAPI } from "../../../api/workflow.gap";
import { RiLoader4Line, RiQuestionLine } from "react-icons/ri";

export default function ExtractorOutput({ result }) {
  const group_id = useGroup().groupId;

  const [items, setItems] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchGaps() {
      if (!group_id) return;

      setLoading(true);
      try {
        const res = await getGapsByGroupAPI(group_id);
        const data = res.data || [];
        setItems(data);

        if (result?.id) {
          setActiveId(result.id);
        } else if (data.length > 0) {
          setActiveId(data[0].id);
        }
      } catch (err) {
        console.error("Error fetching gaps:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchGaps();
  }, [group_id, result]);

  const activeItem = items.find((p) => p.id === activeId);

  return (
    <div
      className="h-100 d-flex flex-column rounded-4 p-3"
      style={{
        backgroundColor: "#1e1e2f",
        border: "1px solid #3a3a55",
        color: "#e4e4f0",
        minHeight: 0,
      }}
    >
      <div className="d-flex gap-3 h-100" style={{ minHeight: 0 }}>
        {/* LEFT SIDEBAR — Titles only */}
        <div
          className="d-flex flex-column"
          style={{
            width: "200px",   
            maxWidth: "35%",
            borderRight: "1px solid #3a3a55",
            minHeight: 0,
          }}
        >
          <div className="mb-2">
            <p
              className="small fw-bold text-uppercase mb-0"
              style={{ color: "#a1a1b5" }}
            >
              Extracted Gap Sources ({items.length})
            </p>
          </div>

          <div
            className="flex-grow-1"
            style={{ overflowY: "auto", minHeight: 0 }}
          >
            {loading ? (
              <div className="text-center mt-5">
                <RiLoader4Line className="fs-1 mb-2" />
                <p style={{ color: "#a1a1b5" }}>Loading gaps...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center mt-5">
                <RiQuestionLine className="fs-1 mb-2" />
                <p style={{ color: "#a1a1b5" }}>
                  No gaps extracted yet.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className="p-3 mb-2 rounded-3"
                  style={{
                    cursor: "pointer",
                    backgroundColor:
                      activeId === item.id ? "#5b5bd6" : "#25253a",
                    border: "1px solid #3a3a55",
                    overflow: "hidden",
                  }}
                >
                  <h6
                    className="fw-bold mb-0 text-truncate"
                    style={{ color: "#fff" }}
                    title={item.title}
                  >
                    {item.title}
                  </h6>
                </div>
              ))
            )}
          </div>
        </div>

        <div
          className="flex-grow-1 d-flex flex-column"
          style={{
            paddingLeft: "1rem",
            minHeight: 0,
            maxWidth: "calc(100% - 200px)", 
            overflowY: "auto",
          }}
        >
          {activeItem ? (
            <>
              <h4 className="fw-bold mb-3" style={{ color: "#fff" }}>
                {activeItem.title}
              </h4>
              <div
                className="p-4 rounded-3"
                style={{
                  backgroundColor: "#25253a",
                  border: "1px solid #3a3a55",
                  color: "#a1a1b5",
                }}
              >
                <p className="mb-0">{activeItem.gap}</p>
              </div>
            </>
          ) : (
            <p style={{ color: "#a1a1b5" }}>
              Select a source to view extracted gap.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}