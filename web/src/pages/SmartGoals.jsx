import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Clipboard,
  Compass,
  ChevronRight,
  Download,
  Eye,
  FileCheck2,
  Info,
  LoaderCircle,
  Pencil,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../api/http";
import Navbar from "../components/Navbar";
import { useTheme } from "../context/ThemeContext";
import "../styles/smart-goals.css";

function formatDraftTime(iso) {
  if (!iso) return "Saved draft";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Saved draft";
  }
}

function getWordCount(text) {
  return text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

function readSavedIntroduction(groupId) {
  try {
    const raw = localStorage.getItem(`citewise.${groupId}.smartGoalsIntroduction`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

const GOAL_FIELDS = [
  ["objective", "Objective"],
  ["specific", "Specific"],
  ["measurable", "Measurable"],
  ["achievable", "Achievable"],
  ["relevant", "Relevant"],
  ["timeBound", "Time-bound"],
];

const SMART_FIELD_HELP = {
  objective: "State the intended research outcome.",
  specific: "Describe exactly what the study will examine.",
  measurable: "Name an observable result or measure.",
  achievable: "Keep it feasible with the stated resources.",
  relevant: "Connect it directly to the selected research gap.",
  timeBound: "Add a deadline only when one is confirmed.",
};

const EMPTY_GOAL = {
  objective: "",
  specific: "",
  measurable: "",
  achievable: "",
  relevant: "",
  timeBound: "",
  sourceRefs: [],
  assumptions: [],
  needsUserInput: [],
  evaluation: null,
  evaluationOutdated: false,
  reviewStatus: "pending",
};

const WORKFLOW_STAGES = [
  { id: "plan", label: "Choose inputs", number: "01", icon: BookOpen },
  { id: "goals", label: "Refine goals", number: "02", icon: Target },
  { id: "review", label: "Review plan", number: "03", icon: FileCheck2 },
  { id: "paper", label: "Combined draft", number: "04", icon: BookOpen },
];

function readGroupData(groupId) {
  try {
    return JSON.parse(localStorage.getItem(`citewise.${groupId}.catalystData`) || "{}");
  } catch {
    return {};
  }
}

function readSavedGeneration(groupId) {
  try {
    return JSON.parse(localStorage.getItem(`citewise.${groupId}.smartGoals`) || "null");
  } catch {
    return null;
  }
}

function markGoalsForReviewGrading(generation) {
  if (!generation?.goals) return generation;
  return {
    ...generation,
    goals: generation.goals.map((goal) => ({
      ...goal,
      evaluationOutdated: Boolean(goal?.evaluationOutdated || !goal?.evaluation),
    })),
  };
}

function normalizeIntroductionVersion(value) {
  if (!value || typeof value !== "object" || typeof value.content !== "string" || !value.content.trim()) return null;
  return {
    id: typeof value.id === "string" ? value.id : "",
    label: typeof value.label === "string" ? value.label : "Selected introduction",
    content: value.content,
    references: Array.isArray(value.references)
      ? value.references
          .map((ref) => (typeof ref === "string" ? ref : ref?.raw || ref?.title || ""))
          .filter(Boolean)
      : [],
    timestamp: typeof value.timestamp === "string" ? value.timestamp : null,
  };
}

function readSelectedIntroduction(groupId) {
  try {
    const stored = JSON.parse(localStorage.getItem(`citewise.${groupId}.smartGoalsIntroduction`) || "null");
    return normalizeIntroductionVersion(stored);
  } catch {
    return null;
  }
}

function readApprovedPapers(groupId) {
  try {
    const sessionId = localStorage.getItem(`citewise.${groupId}.sessionId`);
    if (!sessionId) return [];
    const key = `citewise_approved_docs_${sessionId}`;
    const papers = JSON.parse(localStorage.getItem(key) || sessionStorage.getItem(key) || "[]");
    return Array.isArray(papers) ? papers : [];
  } catch {
    return [];
  }
}

function paperSourceLabel(papers, sourceId) {
  const paper = papers.find((item) => String(item.id) === String(sourceId));
  return paper?.title || paper?.name || paper?.fileName || sourceId;
}

const docxCrcTable = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function createDocxBlob(text) {
  const write16 = (target, value) => target.push(value & 0xff, (value >>> 8) & 0xff);
  const write32 = (target, value) => target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
  const crc32 = (bytes) => {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = docxCrcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  };
  const encoder = new TextEncoder();
  const chunks = [];
  const centralDirectory = [];
  let offset = 0;

  const files = [
    {
      name: "[Content_Types].xml",
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    },
    {
      name: "_rels/.rels",
      content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    },
    {
      name: "word/document.xml",
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${String(text).split("\n").map((line) => `<w:p><w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r></w:p>`).join("")}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
    },
  ];

  for (const file of files) {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const checksum = crc32(content);
    const local = [];
    write32(local, 0x04034b50); write16(local, 20); write16(local, 0); write16(local, 0);
    write16(local, 0); write16(local, 0); write32(local, checksum); write32(local, content.length);
    write32(local, content.length); write16(local, name.length); write16(local, 0);
    chunks.push(new Uint8Array(local), name, content);

    const central = [];
    write32(central, 0x02014b50); write16(central, 20); write16(central, 20); write16(central, 0);
    write16(central, 0); write16(central, 0); write16(central, 0); write32(central, checksum);
    write32(central, content.length); write32(central, content.length); write16(central, name.length);
    write16(central, 0); write16(central, 0); write16(central, 0); write16(central, 0);
    write32(central, 0); write32(central, offset);
    centralDirectory.push(new Uint8Array(central), name);
    offset += local.length + name.length + content.length;
  }

  const centralSize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = [];
  write32(end, 0x06054b50); write16(end, 0); write16(end, 0); write16(end, files.length);
  write16(end, files.length); write32(end, centralSize); write32(end, offset); write16(end, 0);
  return new Blob([...chunks, ...centralDirectory, new Uint8Array(end)], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

function downloadBlob(blob, filename) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(value) {
  return [...value]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127 && !/[<>:"/\\|?*]/.test(character);
    })
    .join("")
    .replace(/[. ]+$/, "");
}

function isGoalComplete(goal) {
  return GOAL_FIELDS.every(([field]) => goal[field]?.trim());
}

function scoreLabel(score) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Weak";
}

function renderReviewText(value) {
  const text = String(value ?? "");
  const pendingPattern = /\b(?:must|needs? to|has to) be (?:defined|confirmed|determined) by the researcher\b|\b(?:timeline|deadline|sample size|population|target) (?:is )?to be (?:confirmed|determined)\b|\bresearcher to (?:determine|confirm)[^.;]*/gi;
  const matches = [...text.matchAll(pendingPattern)];
  if (!matches.length) return text;

  const parts = [];
  let cursor = 0;
  matches.forEach((match, index) => {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(<mark className="smart-goals-pending-mark" key={`${match.index}-${index}`}>{match[0]}</mark>);
    cursor = match.index + match[0].length;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

export default function SmartGoals() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark } = useTheme();

  const [selectedIntroduction, setSelectedIntroduction] = useState(() => {
    if (location.state?.selectedIntroduction) return location.state.selectedIntroduction;
    return readSavedIntroduction(groupId);
  });
  const [isSelectingIntroduction, setIsSelectingIntroduction] = useState(() => {
    const existing = location.state?.selectedIntroduction || readSavedIntroduction(groupId);
    return !existing;
  });
  const [savedIntroductions, setSavedIntroductions] = useState([]);
  const [isLoadingDrafts, setIsLoadingDrafts] = useState(true);
  const [selectedDraftId, setSelectedDraftId] = useState(() => {
    const existing = location.state?.selectedIntroduction || readSavedIntroduction(groupId);
    return existing?.id || null;
  });
  const [previewingDraft, setPreviewingDraft] = useState(null);

  const [groupData, setGroupData] = useState({});
  const [researchTitle, setResearchTitle] = useState("");
  const [selectedGap, setSelectedGap] = useState("");
  const [generation, setGeneration] = useState(null);
  const [generationGroupId, setGenerationGroupId] = useState(null);
  const [activeStage, setActiveStage] = useState("plan");
  const [guideStep, setGuideStep] = useState(-1);
  const [guideSpotlight, setGuideSpotlight] = useState(null);
  const [activeGoalIndex, setActiveGoalIndex] = useState(0);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingGoalIndex, setRegeneratingGoalIndex] = useState(null);
  const [isReviewEvaluating, setIsReviewEvaluating] = useState(false);
  const [reviewGradeError, setReviewGradeError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [finalFilename, setFinalFilename] = useState("");
  const [finalFileFormat, setFinalFileFormat] = useState("PDF");
  const [copyStatus, setCopyStatus] = useState("");
  const [error, setError] = useState("");
  const reviewEvaluationInFlight = useRef(false);
  const finishFilenameInput = useRef(null);
  const goalsReady = Boolean(generation?.goals?.length);
  const smartGoalsGuideSteps = useMemo(() => {
    const steps = [
      { target: "guide-trigger", stage: "plan", title: "Your SMART Goals Guide", description: "This walkthrough points out where to enter your research focus, generate objectives, review the AI estimates, and combine your final selections." },
      { target: "workflow-stepper", stage: "plan", title: "Move through the four stages", description: "Use this step bar to move between choosing inputs, refining objectives, reviewing decisions, and viewing the combined draft." },
      { target: "study-focus", stage: "plan", title: "Set your study focus", description: "Enter your research title and choose one primary gap. The objectives will be generated to address this specific gap." },
      { target: "generate-goals", stage: "plan", title: "Generate SMART objectives", description: "When your title and gap are ready, choose Generate goals. The AI uses approved RRL evidence to draft objectives. Regenerating replaces this draft." },
    ];

    if (goalsReady) {
      steps.push(
        { target: "objective-list", stage: "goals", title: "Choose an objective to refine", description: "Select an objective here to edit it. The Add objective control lets you add another objective to your plan." },
        { target: "goal-editor", stage: "goals", title: "Refine the SMART criteria", description: "Work through Specific, Measurable, Achievable, Relevant, and Time-bound. The AI grades the latest version of every objective when you open Review plan." },
        { target: "review-stage", stage: "goals", title: "Open Review plan", description: "When you are ready, use Review goals to assess the latest version of each objective and decide which ones to keep." },
        { target: "review-decisions", stage: "review", title: "Accept or decline each objective", description: "Use Accept objective for goals you want to keep, or Decline for goals you do not. Declined goals can be regenerated individually. Accept at least three objectives before saving." },
        { target: "save-combine", stage: "review", title: "Save and combine", description: "This saves your accepted SMART goals and the selected Step 2 introduction to your account, then opens the Combined draft." },
        { target: "combined-preview", stage: "paper", title: "Review the combined draft", description: "Check how the selected introduction, title, gap, aim, accepted objectives, and references fit together. This combines your content without rewriting it." },
        { target: "finish", stage: "paper", title: "Finish your review", description: "Select Finish to preview the final paper and optionally download it as a PDF or Word document before returning to your workspaces." },
      );
    } else {
      steps.push({
        target: "generate-goals",
        stage: "plan",
        title: "Generate objectives to continue",
        description: "This workspace does not have generated objectives yet. Close the guide, select Generate goals, and reopen the guide to learn how to refine, review, and combine them.",
      });
    }

    return steps;
  }, [goalsReady]);
  const guideOpen = guideStep >= 0;
  const activeGuideStep = smartGoalsGuideSteps[guideStep];

  useEffect(() => {
    let active = true;
    if (!groupId) return;

    async function loadWorkspaceDrafts() {
      setIsLoadingDrafts(true);
      try {
        let sid = localStorage.getItem(`citewise.${groupId}.sessionId`);
        if (!sid) {
          try {
            const res = await apiRequest(`/api/v1/documents/session-for-group/${encodeURIComponent(groupId)}`);
            sid = res?.data?.sessionId;
            if (sid) localStorage.setItem(`citewise.${groupId}.sessionId`, sid);
          } catch (err) {
            console.warn("[SmartGoals] Could not resolve session for group:", err);
          }
        }

        let versions = [];
        if (sid) {
          try {
            const raw = localStorage.getItem(`citewise.draftVersions.${sid}`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) versions = parsed;
            }
          } catch (err) {
            console.warn("[SmartGoals] Failed parsing draft versions:", err);
          }

          try {
            const activeRaw = localStorage.getItem(`citewise_draft_${sid}`);
            if (activeRaw) {
              const parsedActive = JSON.parse(activeRaw);
              if (parsedActive?.content?.trim()) {
                const alreadyPresent = versions.some(
                  (v) => v.content?.trim() === parsedActive.content.trim()
                );
                if (!alreadyPresent) {
                  versions.unshift({
                    id: "active-synthesis-draft",
                    label: "Current Synthesis Draft",
                    content: parsedActive.content,
                    references: Array.isArray(parsedActive.references) ? parsedActive.references : [],
                    timestamp: parsedActive.timestamp || new Date().toISOString(),
                    source: "current",
                  });
                }
              }
            }
          } catch (err) {
            console.warn("[SmartGoals] Failed parsing active draft:", err);
          }

          try {
            const serverDraft = await apiRequest(`/api/v1/synthesis/status?sessionId=${encodeURIComponent(sid)}`);
            if (
              serverDraft?.contentText?.trim() &&
              serverDraft.status !== "GENERATING" &&
              serverDraft.status !== "FAILED"
            ) {
              const refsArray = (serverDraft.referencesText || "")
                .split("\n")
                .map((ref) => ref.trim())
                .filter(Boolean);
              const alreadyPresent = versions.some(
                (v) => v.content?.trim() === serverDraft.contentText.trim()
              );
              if (!alreadyPresent) {
                versions.unshift({
                  id: serverDraft.draftId ? `db-draft-${serverDraft.draftId}` : "db-synthesis-draft",
                  label: "Saved Synthesis Draft",
                  content: serverDraft.contentText,
                  references: refsArray,
                  timestamp: serverDraft.createdAt || new Date().toISOString(),
                  source: "database",
                });
              }
            }
          } catch {
            // Non-fatal if no server synthesis draft exists yet
          }
        }

        if (!active) return;
        setSavedIntroductions(versions);
        if (versions.length > 0) {
          setSelectedDraftId((prev) => prev || (selectedIntroduction ? selectedIntroduction.id : versions[0].id));
        }
      } finally {
        if (active) setIsLoadingDrafts(false);
      }
    }

    loadWorkspaceDrafts();
    return () => {
      active = false;
    };
  }, [groupId, selectedIntroduction]);

  function handleConfirmIntroSelection(draftToUse) {
    const chosen = draftToUse || savedIntroductions.find((d) => d.id === selectedDraftId) || savedIntroductions[0];
    if (chosen) {
      const normalizedChosen = normalizeIntroductionVersion(chosen);
      setSelectedIntroduction(normalizedChosen || chosen);
      setGeneration((current) => (current ? { ...current, introductionVersion: normalizedChosen } : current));
      try {
        localStorage.setItem(`citewise.${groupId}.smartGoalsIntroduction`, JSON.stringify(normalizedChosen || chosen));
      } catch (err) {
        console.warn("[SmartGoals] Could not persist selected introduction:", err);
      }
    }
    setIsSelectingIntroduction(false);
  }

  function handleSkipIntroSelection() {
    setSelectedIntroduction(null);
    setGeneration((current) => (current ? { ...current, introductionVersion: null } : current));
    try {
      localStorage.removeItem(`citewise.${groupId}.smartGoalsIntroduction`);
    } catch {}
    setIsSelectingIntroduction(false);
  }

  useEffect(() => {
    let active = true;
    const data = readGroupData(groupId);
    const saved = readSavedGeneration(groupId);
    const introduction = readSelectedIntroduction(groupId);
    const hydratedSaved = saved
      ? { ...markGoalsForReviewGrading(saved), introductionVersion: normalizeIntroductionVersion(saved.introductionVersion) || introduction }
      : null;
    setGroupData(data);
    setSelectedIntroduction(introduction || hydratedSaved?.introductionVersion || null);
    if (hydratedSaved?.goals?.length) setIsSelectingIntroduction(false);
    setResearchTitle(hydratedSaved?.researchTitle || data.title || "");
    setSelectedGap(hydratedSaved?.selectedGap || data.gaps?.[0] || "");
    setGeneration(hydratedSaved);
    setGenerationGroupId(groupId);
    setActiveStage(hydratedSaved?.goals?.length ? "goals" : "plan");
    setActiveGoalIndex(0);
    setCopyStatus("");
    setError("");
    setReviewGradeError("");
    reviewEvaluationInFlight.current = false;

    if (groupId && !saved?.goals?.length) {
      apiRequest(`/api/v1/smart-goals/saved/${encodeURIComponent(groupId)}`)
        .then(({ generation: savedGeneration }) => {
          if (!active || !savedGeneration?.goals?.length) return;
          const hydratedGeneration = {
            ...markGoalsForReviewGrading(savedGeneration),
            introductionVersion: normalizeIntroductionVersion(savedGeneration.introductionVersion) || introduction,
          };
          if (hydratedGeneration.introductionVersion) {
            setSelectedIntroduction(hydratedGeneration.introductionVersion);
            try {
              localStorage.setItem(`citewise.${groupId}.smartGoalsIntroduction`, JSON.stringify(hydratedGeneration.introductionVersion));
            } catch {}
          }
          setIsSelectingIntroduction(false);
          setGeneration(hydratedGeneration);
          setGenerationGroupId(groupId);
          setResearchTitle(hydratedGeneration.researchTitle || data.title || "");
          setSelectedGap(hydratedGeneration.selectedGap || data.gaps?.[0] || "");
          setActiveStage("goals");
        })
        .catch(() => {});
    }

    return () => { active = false; };
  }, [groupId]);

  useEffect(() => {
    if (!generation || generationGroupId !== groupId) return;
    try {
      localStorage.setItem(`citewise.${groupId}.smartGoals`, JSON.stringify(generation));
    } catch {
      setError("Your browser could not save this draft locally.");
    }
  }, [generation, generationGroupId, groupId]);

  useEffect(() => {
    if (activeStage !== "review" || !goalsReady || reviewGradeError || reviewEvaluationInFlight.current) return undefined;
    const pendingGoals = generation.goals
      .map((goal, index) => ({ goal, index }))
      .filter(({ goal }) => goal.evaluationOutdated || !goal.evaluation);
    if (!pendingGoals.length) return undefined;

    const goalContent = (goal) => GOAL_FIELDS.map(([field]) => goal[field] || "").join("\n");
    const submittedGoals = pendingGoals.map(({ goal }) => ({ ...goal }));
    const submittedContent = submittedGoals.map(goalContent);
    let active = true;
    reviewEvaluationInFlight.current = true;
    setIsReviewEvaluating(true);
    apiRequest("/api/v1/smart-goals/evaluate-goals", {
      method: "POST",
      body: JSON.stringify({
        groupId,
        researchTitle: generation.researchTitle || researchTitle,
        selectedGap: generation.selectedGap || selectedGap,
        goals: submittedGoals,
      }),
    })
      .then(({ evaluations }) => {
        if (!Array.isArray(evaluations) || evaluations.length !== pendingGoals.length) {
          throw new Error("The grading response did not match the objectives. Please retry.");
        }
        if (!active) return;
        setGeneration((current) => ({
          ...current,
          goals: current.goals.map((goal, index) => {
            const submittedIndex = pendingGoals.findIndex((item) => item.index === index);
            if (submittedIndex < 0 || goalContent(goal) !== submittedContent[submittedIndex]) return goal;
            return { ...goal, evaluation: evaluations[submittedIndex], evaluationOutdated: false };
          }),
        }));
        setReviewGradeError("");
      })
      .catch((gradeError) => {
        if (active) {
          setReviewGradeError(import.meta.env.DEV
            ? gradeError.message || "Could not grade the current objectives. Please retry."
            : "Could not grade the current objectives right now. Please retry.");
        }
      })
      .finally(() => {
        reviewEvaluationInFlight.current = false;
        if (active) setIsReviewEvaluating(false);
      });

    return () => {
      active = false;
      reviewEvaluationInFlight.current = false;
    };
  }, [activeStage, generation, goalsReady, groupId, researchTitle, reviewGradeError, selectedGap]);

  useEffect(() => {
    if (!guideOpen || !activeGuideStep) {
      setGuideSpotlight(null);
      return undefined;
    }

    const target = document.querySelector(`[data-smart-guide="${activeGuideStep.target}"]`);
    if (!target) {
      setGuideSpotlight(null);
      return undefined;
    }

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    const updateSpotlight = () => {
      const rect = target.getBoundingClientRect();
      const padding = window.innerWidth <= 700 ? 7 : 10;
      const left = Math.max(4, rect.left - padding);
      setGuideSpotlight({
        top: Math.max(4, rect.top - padding),
        left,
        width: Math.min(window.innerWidth - left - 4, rect.width + padding * 2),
        height: rect.height + padding * 2,
        borderRadius: Math.max(parseInt(window.getComputedStyle(target).borderRadius, 10) || 12, 14),
      });
    };

    updateSpotlight();
    const timers = [100, 250, 450, 700].map((delay) => window.setTimeout(updateSpotlight, delay));
    let frameId;
    const startTime = performance.now();
    const trackTarget = (time) => {
      updateSpotlight();
      if (time - startTime < 650) frameId = window.requestAnimationFrame(trackTarget);
    };
    frameId = window.requestAnimationFrame(trackTarget);
    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, true);

    return () => {
      window.cancelAnimationFrame(frameId);
      timers.forEach(window.clearTimeout);
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight, true);
    };
  }, [activeGuideStep, guideOpen]);

  useEffect(() => {
    if (!guideOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setGuideStep(-1);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [guideOpen]);

  useEffect(() => {
    if (!isFinishModalOpen) return undefined;
    finishFilenameInput.current?.focus();
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsFinishModalOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isFinishModalOpen]);

  function startSmartGoalsGuide() {
    setActiveStage("plan");
    setGuideStep(0);
  }

  function moveSmartGoalsGuide(direction) {
    const nextIndex = guideStep + direction;
    if (nextIndex < 0) return;
    if (nextIndex >= smartGoalsGuideSteps.length) {
      setGuideStep(-1);
      return;
    }
    setActiveStage(smartGoalsGuideSteps[nextIndex].stage);
    setGuideStep(nextIndex);
  }

  async function handleGenerate(event) {
    event.preventDefault();
    if (!researchTitle.trim() || !selectedGap.trim()) {
      setError("Complete the research title and gap before generating goals.");
      return;
    }

    setIsGenerating(true);
    setError("");
    try {
      const result = await apiRequest("/api/v1/smart-goals/generate", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          researchTitle: researchTitle.trim(),
          selectedGap: selectedGap.trim(),
        }),
      });
      setGeneration({
        ...markGoalsForReviewGrading(result),
        introductionVersion: selectedIntroduction,
      });
      setActiveGoalIndex(0);
      setActiveStage("goals");
    } catch (requestError) {
      setError(import.meta.env.DEV
        ? requestError.message || "Could not generate SMART goals. Please try again."
        : "Could not generate SMART goals right now. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateGoal(index, field, value) {
    setGeneration((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) => {
        if (goalIndex !== index) return goal;
        const changesSMARTContent = GOAL_FIELDS.some(([goalField]) => goalField === field) && goal[field] !== value;
        return {
          ...goal,
          [field]: value,
          ...(changesSMARTContent ? { evaluationOutdated: true, reviewStatus: "pending" } : {}),
        };
      }),
    }));
  }

  function setGoalReviewStatus(index, status) {
    setGeneration((current) => ({
      ...current,
      goals: current.goals.map((goal, goalIndex) => goalIndex === index
        ? { ...goal, reviewStatus: goal.reviewStatus === status ? "pending" : status }
        : goal),
    }));
  }

  async function regenerateDeclinedGoal(index) {
    const declinedGoal = generation?.goals?.[index];
    if (!declinedGoal || declinedGoal.reviewStatus !== "declined" || regeneratingGoalIndex !== null) return;

    setRegeneratingGoalIndex(index);
    setError("");
    try {
      const result = await apiRequest("/api/v1/smart-goals/regenerate-goal", {
        method: "POST",
        body: JSON.stringify({
          groupId,
          researchTitle: generation.researchTitle || researchTitle,
          selectedGap: generation.selectedGap || selectedGap,
          declinedGoal,
          existingObjectives: generation.goals
            .filter((_, goalIndex) => goalIndex !== index)
            .map((goal) => goal.objective)
            .filter(Boolean),
        }),
      });
      const replacementGoal = result.goals?.[0];
      if (!replacementGoal) throw new Error("The AI did not return a replacement objective.");
      setGeneration((current) => ({
        ...current,
        goals: current.goals.map((goal, goalIndex) => goalIndex === index
          ? { ...replacementGoal, evaluationOutdated: Boolean(!replacementGoal.evaluation), reviewStatus: "pending" }
          : goal),
      }));
      setActiveGoalIndex(index);
    } catch (requestError) {
      setError(import.meta.env.DEV
        ? requestError.message || "Could not regenerate this objective. Please try again."
        : "Could not regenerate this objective right now. Please try again.");
    } finally {
      setRegeneratingGoalIndex(null);
    }
  }

  function addGoal() {
    setGeneration((current) => ({ ...current, goals: [...current.goals, { ...EMPTY_GOAL }] }));
    setActiveGoalIndex(generation.goals.length);
    setPendingDeleteIndex(null);
  }

  function removeGoal(index) {
    if (generation.goals.length <= 1) return;
    const nextGoals = generation.goals.filter((_, goalIndex) => goalIndex !== index);
    setGeneration({ ...generation, goals: nextGoals });
    setActiveGoalIndex(Math.max(0, Math.min(index, nextGoals.length - 1)));
    setPendingDeleteIndex(null);
  }

  async function copyReview() {
    const markdown = [
      `# ${generation.researchTitle || groupData.title || "Research SMART Goals"}`,
      `\n## Overall aim\n${generation.overallAim || ""}`,
      ...generation.goals.map((goal, index) => [
        `\n## Goal ${index + 1}: ${goal.objective}`,
        `- **Decision:** ${goal.reviewStatus || "pending"}`,
        ...(goal.evaluation ? [
          `- **AI gap alignment:** ${goal.evaluation.gapAlignmentScore}/100`,
          `- **AI SMART quality:** ${goal.evaluation.smartQualityScore}/100`,
          `- **AI assessment:** ${goal.evaluation.feedback}`,
        ] : []),
        ...GOAL_FIELDS.slice(1).map(([field, label]) => `- **${label}:** ${goal[field] || ""}`),
          ...(goal.needsUserInput?.length ? ["- **Optional planning notes:**", ...goal.needsUserInput.map((item) => `  - ${item}`)] : []),
        goal.sourceRefs?.length ? `- **Source IDs:** ${goal.sourceRefs.join(", ")}` : "",
      ].filter(Boolean).join("\n")),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(markdown);
      setCopyStatus("Copied");
      window.setTimeout(() => setCopyStatus(""), 1800);
    } catch {
      setError("Clipboard access was blocked. You can still edit or download your goals.");
    }
  }

  async function exportReview(format, includeIntroduction = false, requestedFilename = "") {
    const acceptedGoals = generation.goals.filter((goal) => goal.reviewStatus === "accepted");
    const paperGoals = includeIntroduction ? acceptedGoals : generation.goals;
    const references = generation.introductionVersion?.references || selectedIntroduction?.references || [];
    const plainText = [
      generation.researchTitle || groupData.title || "Research SMART Goals",
      "",
      ...(includeIntroduction ? [
        "Introduction",
        generation.introductionVersion?.content || selectedIntroduction?.content || "No Step 2 introduction was selected.",
        "",
      ] : []),
      "Research Gap",
      generation.selectedGap || selectedGap || "Not specified",
      "",
      "Overall Research Aim",
      generation.overallAim || "Not specified",
      ...(includeIntroduction ? ["", "SMART Objectives"] : []),
      ...paperGoals.flatMap((goal, index) => [
        "",
        `Objective ${index + 1}: ${goal.objective || "Untitled objective"}`,
        ...(!includeIntroduction ? [
          `Decision: ${goal.reviewStatus || "Pending review"}`,
          ...(goal.evaluation ? [
            `AI gap alignment: ${goal.evaluation.gapAlignmentScore}/100${goal.evaluationOutdated ? " (original text; now outdated)" : ""}`,
            `AI SMART quality: ${goal.evaluation.smartQualityScore}/100${goal.evaluationOutdated ? " (original text; now outdated)" : ""}`,
            `AI assessment: ${goal.evaluation.feedback}`,
          ] : ["AI assessment: Not available"]),
        ] : []),
        ...GOAL_FIELDS.slice(1).map(([field, label]) => `${label}: ${goal[field] || "Not specified"}`),
        ...(includeIntroduction && goal.sourceRefs?.length
          ? [`Evidence sources: ${goal.sourceRefs.map((sourceId) => paperSourceLabel(approvedPapers, sourceId)).join("; ")}`]
          : []),
        ...(!includeIntroduction && goal.needsUserInput?.length ? ["Optional planning notes:", ...goal.needsUserInput.map((item) => `- ${item}`)] : []),
        ...(!includeIntroduction && goal.sourceRefs?.length ? [`Evidence sources: ${goal.sourceRefs.join(", ")}`] : []),
      ]),
      ...(includeIntroduction ? [
        "",
        "References",
        ...(references.length ? references : ["No references were included with the selected introduction."]),
      ] : []),
    ].join("\n");
    const filenameBase = requestedFilename.trim()
      ? sanitizeFilename(requestedFilename.trim()).replace(/\.(pdf|docx)$/i, "").replace(/[. ]+$/, "")
      : includeIntroduction ? `research-draft-${groupId}` : `smart-goals-${groupId}`;
    if (!filenameBase) {
      setError("Enter a valid filename before downloading the final paper.");
      return;
    }

    try {
      if (format === "TXT") {
        downloadBlob(new Blob([plainText], { type: "text/plain;charset=utf-8" }), `${filenameBase}.txt`);
        return;
      }

      if (format === "DOCX") {
        downloadBlob(createDocxBlob(plainText), `${filenameBase}.docx`);
        return;
      }

      if (format === "PDF") {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ unit: "pt", format: "letter" });
        const margin = 54;
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const lines = pdf.splitTextToSize(plainText, pageWidth - margin * 2);
        let y = margin;
        pdf.setFont("Times", "normal");
        pdf.setFontSize(11);
        for (const line of lines) {
          if (y + 14 > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += 14;
        }
        pdf.save(`${filenameBase}.pdf`);
      }
    } catch {
      setError(`Could not export the plan as ${format}. Please try again.`);
    }
  }

  async function handleSaveAndCombine() {
    if (!generation || isSaving) return;
    if (!canFinishReview) {
      setError(acceptedGoalCount < 3
        ? "Accept at least 3 SMART objectives, and accept or decline every objective, before saving and combining."
        : "Accept or decline every objective before saving and combining.");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const payloadGeneration = {
        ...generation,
        introductionVersion: normalizeIntroductionVersion(selectedIntroduction) || normalizeIntroductionVersion(generation.introductionVersion) || null,
      };
      await apiRequest("/api/v1/smart-goals/save", {
        method: "POST",
        body: JSON.stringify({ groupId, generation: payloadGeneration }),
      });
      setGeneration(payloadGeneration);
      setActiveStage("paper");
    } catch (saveError) {
      setError(import.meta.env.DEV
        ? saveError.message || "Could not save SMART goals. Please try again."
        : "Could not save SMART goals right now. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleFinish() {
    const baseName = sanitizeFilename((generation?.researchTitle || groupData.title || "research-paper")
      .trim()
      .replace(/\s+/g, "-"));
    setFinalFilename(baseName || "research-paper");
    setError("");
    setIsFinishModalOpen(true);
  }

  function completeSmartGoals() {
    setIsFinishModalOpen(false);
    navigate("/groups");
  }

  function scoreTone(score) {
    if (score >= 85) return "is-strong";
    if (score >= 70) return "is-good";
    if (score >= 50) return "is-needs-work";
    return "is-weak";
  }

  const completedFieldCount = (goal) => GOAL_FIELDS.filter(([field]) => goal[field]?.trim()).length;
  const activeGoal = generation?.goals?.[activeGoalIndex];
  const totalCriteriaFilled = generation?.goals?.reduce((count, goal) => count + completedFieldCount(goal), 0) || 0;
  const selectedStageIndex = WORKFLOW_STAGES.findIndex((stage) => stage.id === activeStage);

  const gaps = Array.isArray(groupData.gaps) ? groupData.gaps : [];
  const introduction = normalizeIntroductionVersion(selectedIntroduction) || normalizeIntroductionVersion(generation?.introductionVersion);
  const acceptedGoals = generation?.goals?.filter((goal) => goal.reviewStatus === "accepted") || [];
  const approvedPapers = readApprovedPapers(groupId);
  const approvedPaperCount = approvedPapers.length || generation?.approvedSourceCount || 0;
  const acceptedGoalCount = generation?.goals?.filter((goal) => goal.reviewStatus === "accepted").length || 0;
  const reviewedGoalCount = generation?.goals?.filter((goal) => ["accepted", "declined"].includes(goal.reviewStatus)).length || 0;
  const canFinishReview = goalsReady && acceptedGoalCount >= 3 && reviewedGoalCount === generation.goals.length
    && !isReviewEvaluating;
  const canGenerate = Boolean(researchTitle.trim() && selectedGap.trim());

  if (isSelectingIntroduction) {
    return (
      <div className="smart-goals-page">
        <Navbar />
        <main className="smart-goals-shell">
          <header className="workflow-header smart-goals-page-header">
            <div className="workflow-header-left">
              <button
                className="workflow-back-btn"
                type="button"
                onClick={() => {
                  if (selectedIntroduction || generation?.goals?.length) {
                    setIsSelectingIntroduction(false);
                  } else {
                    navigate("/groups");
                  }
                }}
                aria-label="Back"
                title="Back"
              >
                <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
              </button>
              <div className="workflow-title-block">
                <h1>Select Introduction Draft</h1>
                <p className="workflow-description">Choose which synthesized introduction from this workspace will guide your SMART research objectives.</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                onClick={() => navigate(`/citewise/${groupId}`)}
                className="smart-goals-secondary-action"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, padding: "8px 14px", borderRadius: 8 }}
                title="Open CiteWise workspace to draft or edit introductions"
              >
                <PenLine size={15} />
                <span>Open CiteWise (Step 2)</span>
              </button>
            </div>
          </header>

          {isLoadingDrafts ? (
            <div style={{ textAlign: "center", padding: "64px 20px" }}>
              <LoaderCircle className="smart-goals-spinner" size={32} style={{ margin: "0 auto 16px", color: "#ea580c" }} />
              <p style={{ color: "#64748b", fontFamily: "'Poppins', sans-serif", fontSize: "0.95rem" }}>
                Loading saved introduction drafts for this workspace...
              </p>
            </div>
          ) : savedIntroductions.length === 0 ? (
            <div className="smart-goals-intro-empty-card">
              <div className="smart-goals-intro-empty-icon">
                <BookOpen size={36} />
              </div>
              <h2>No Saved Introductions Found</h2>
              <p>
                This workspace doesn't have any synthesized introduction drafts in CiteWise yet.
                Drafting an introduction in Step 2 helps ground your SMART research goals in verified literature citations and empirical evidence.
              </p>
              <div className="smart-goals-intro-empty-actions">
                <button
                  type="button"
                  className="smart-goals-generate"
                  onClick={() => navigate(`/citewise/${groupId}`)}
                  style={{ padding: "10px 22px", borderRadius: 10, fontSize: "0.92rem", fontWeight: 700 }}
                >
                  <PenLine size={16} />
                  <span>Draft Introduction in CiteWise</span>
                </button>
                <button
                  type="button"
                  className="smart-goals-secondary-action"
                  onClick={handleSkipIntroSelection}
                  style={{ padding: "10px 20px", borderRadius: 10, fontSize: "0.92rem" }}
                >
                  <ArrowRight size={16} />
                  <span>Continue to SMART Goals Without Draft</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="smart-goals-intro-selection-layout">
              <div className="smart-goals-intro-banner">
                <div className="smart-goals-intro-banner-icon">
                  <Sparkles size={18} />
                </div>
                <div className="smart-goals-intro-banner-text">
                  <strong>Select an introduction draft from this workspace</strong>
                  <span>
                    Your research objectives will align with the empirical findings, theoretical framework, and literature scope of the chosen introduction.
                  </span>
                </div>
              </div>

              <div className="smart-goals-intro-grid" role="radiogroup" aria-label="Saved introductions">
                {savedIntroductions.map((draft) => {
                  const isSelected = selectedDraftId === draft.id;
                  const wordCount = getWordCount(draft.content);
                  const refCount = Array.isArray(draft.references) ? draft.references.length : 0;
                  const isFinal = /final/i.test(draft.label || "") || /final/i.test(draft.source || "");

                  return (
                    <article
                      key={draft.id}
                      className={`smart-goals-intro-card${isSelected ? " is-selected" : ""}`}
                      onClick={() => setSelectedDraftId(draft.id)}
                      role="radio"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedDraftId(draft.id);
                        }
                      }}
                    >
                      <div className="smart-goals-intro-card-header">
                        <div className="smart-goals-intro-radio-box">
                          <span className={`smart-goals-intro-radio${isSelected ? " is-checked" : ""}`}>
                            {isSelected && <Check size={13} strokeWidth={3} />}
                          </span>
                          <div>
                            <h3 className="smart-goals-intro-card-title">{draft.label || "Untitled Draft"}</h3>
                            <span className="smart-goals-intro-card-meta">{formatDraftTime(draft.timestamp)}</span>
                          </div>
                        </div>

                        <div className="smart-goals-intro-badge-row">
                          {isFinal && <span className="smart-goals-intro-pill is-final">Final</span>}
                          <span className="smart-goals-intro-pill is-words">{wordCount} words</span>
                          {refCount > 0 && <span className="smart-goals-intro-pill is-refs">{refCount} citations</span>}
                        </div>
                      </div>

                      <div className="smart-goals-intro-card-body">
                        <p className="smart-goals-intro-excerpt">
                          {draft.content ? draft.content.slice(0, 240).trim() + "..." : "No preview text available."}
                        </p>
                      </div>

                      <div className="smart-goals-intro-card-footer">
                        <button
                          type="button"
                          className="smart-goals-intro-preview-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewingDraft(draft);
                          }}
                        >
                          <Eye size={14} />
                          <span>Read full draft</span>
                        </button>
                        {isSelected && (
                          <span className="smart-goals-intro-selected-indicator">
                            <Check size={14} /> Selected for SMART Goals
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="smart-goals-intro-action-bar">
                <div className="smart-goals-intro-action-stats">
                  <strong>{savedIntroductions.length}</strong>
                  <span>{savedIntroductions.length === 1 ? "draft available" : "drafts available"} in this workspace</span>
                </div>

                <div className="smart-goals-intro-action-buttons">
                  <button
                    type="button"
                    className="smart-goals-secondary-action"
                    onClick={handleSkipIntroSelection}
                  >
                    <span>Continue without draft</span>
                  </button>

                  <button
                    type="button"
                    className="smart-goals-generate"
                    disabled={!selectedDraftId}
                    onClick={() => handleConfirmIntroSelection()}
                  >
                    <Check size={16} />
                    <span>Use Selected Introduction & Proceed</span>
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {previewingDraft && (
          <div className="smart-goals-modal-overlay" onClick={() => setPreviewingDraft(null)}>
            <div className="smart-goals-modal-container" onClick={(e) => e.stopPropagation()}>
              <div className="smart-goals-modal-header">
                <div>
                  <h3>{previewingDraft.label || "Introduction Draft Preview"}</h3>
                  <small>{formatDraftTime(previewingDraft.timestamp)} · {getWordCount(previewingDraft.content)} words</small>
                </div>
                <button type="button" className="smart-goals-modal-close" onClick={() => setPreviewingDraft(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="smart-goals-modal-body">
                <div className="smart-goals-modal-text">
                  {previewingDraft.content}
                </div>
                {previewingDraft.references?.length > 0 && (
                  <div className="smart-goals-modal-references">
                    <h4>References ({previewingDraft.references.length})</h4>
                    <ul>
                      {previewingDraft.references.map((ref, idx) => (
                        <li key={idx}>{ref.raw || ref.title || (typeof ref === "string" ? ref : JSON.stringify(ref))}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <div className="smart-goals-modal-footer">
                <button type="button" className="smart-goals-secondary-action" onClick={() => setPreviewingDraft(null)}>
                  Close
                </button>
                <button
                  type="button"
                  className="smart-goals-generate"
                  onClick={() => {
                    handleConfirmIntroSelection(previewingDraft);
                    setPreviewingDraft(null);
                  }}
                >
                  <Check size={16} />
                  <span>Select this draft & Proceed</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="smart-goals-page">
      <Navbar />
      <main className="smart-goals-shell">
        <header className="workflow-header smart-goals-page-header">
          <div className="workflow-header-left">
            <button className="workflow-back-btn" type="button" onClick={() => navigate("/groups")} aria-label="Back to workspaces" title="Back to workspaces">
              <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <div className="workflow-title-block">
              <h1>SMART Goals</h1>
              <p className="workflow-description">Use your research title, selected gap, and relevant approved RRL evidence to shape clear objectives.</p>
            </div>
          </div>
          <button className="groups-guide-trigger-btn workflow-guide-button" type="button" onClick={startSmartGoalsGuide} data-smart-guide="guide-trigger">
            <Compass size={16} aria-hidden="true" /><span>Guide</span>
          </button>
        </header>

        <nav className="smart-goals-stepper" aria-label="SMART goals workflow" data-smart-guide="workflow-stepper">
          {WORKFLOW_STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const locked = index > 0 && !goalsReady;
            const done = index < selectedStageIndex || (stage.id === "goals" && activeStage === "review");
            return (
              <div className={`smart-goals-step-item${done ? " is-complete" : ""}`} key={stage.id}>
                <button
                  className={`smart-goals-step${activeStage === stage.id ? " is-active" : ""}${done ? " is-done" : ""}`}
                  type="button"
                  disabled={locked}
                  aria-current={activeStage === stage.id ? "step" : undefined}
                  onClick={() => {
                    if (stage.id !== "review") setReviewGradeError("");
                    setActiveStage(stage.id);
                  }}
                >
                  <span className="smart-goals-step-icon">{done ? <Check size={16} /> : <Icon size={17} />}</span>
                  <span className="smart-goals-step-copy"><small>STEP {stage.number}</small><strong>{stage.label}</strong></span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className={`smart-goals-workspace smart-goals-stage-${activeStage}`}>
          <aside className="smart-goals-context-panel">
            {activeStage === "plan" ? (
              <>
                <div className="workflow-card-header smart-goals-side-header">
                  <div>
                    <h2>Selected Introduction</h2>
                    <p>{selectedIntroduction ? "Literature synthesis draft." : "No draft currently linked."}</p>
                  </div>
                  <button
                    type="button"
                    className="smart-goals-edit-button"
                    onClick={() => setIsSelectingIntroduction(true)}
                    title={selectedIntroduction ? "Change selected introduction" : "Select an introduction"}
                  >
                    <RotateCcw size={13} />
                    <span>{selectedIntroduction ? "Change" : "Select"}</span>
                  </button>
                </div>

                {selectedIntroduction ? (
                  <div style={{ padding: "12px 14px", borderRadius: 8, background: isDark ? "#20282a" : "#ffffff", border: isDark ? "1px solid #394447" : "1px solid #e2e8f0", marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <strong style={{ fontSize: 13, color: isDark ? "#f1f5f9" : "#0f172a" }}>{selectedIntroduction.label || "Introduction"}</strong>
                      <span className="smart-goals-count-pill" style={{ fontSize: 11 }}>{getWordCount(selectedIntroduction.content)}w</span>
                    </div>
                    <p style={{ margin: "0 0 8px", fontSize: 12, lineHeight: 1.5, color: isDark ? "#94a3b8" : "#64748b", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {selectedIntroduction.content}
                    </p>
                    <button
                      type="button"
                      className="smart-goals-intro-preview-btn"
                      style={{ padding: 0 }}
                      onClick={() => setPreviewingDraft(selectedIntroduction)}
                    >
                      <Eye size={12} />
                      <span>View full draft</span>
                    </button>
                  </div>
                ) : (
                  <div style={{ padding: "12px 14px", borderRadius: 8, background: isDark ? "#20282a" : "#f8fafc", border: isDark ? "1px dashed #394447" : "1px dashed #cbd5e1", marginBottom: 16, textAlign: "center" }}>
                    <p style={{ margin: "0 0 8px", fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>
                      No introduction linked yet.
                    </p>
                    <button
                      type="button"
                      className="smart-goals-secondary-action"
                      style={{ fontSize: 12, padding: "4px 10px" }}
                      onClick={() => setIsSelectingIntroduction(true)}
                    >
                      <Plus size={13} />
                      <span>Select Draft</span>
                    </button>
                  </div>
                )}

                <div className="workflow-card-header smart-goals-side-header">
                  <div><h2>Approved Evidence</h2><p>RRL papers supporting your objectives.</p></div>
                  <span className="smart-goals-approved-pill">{approvedPaperCount} {approvedPaperCount === 1 ? "paper" : "papers"} approved</span>
                </div>
                <div className="smart-goals-approved-list">
                  {approvedPapers.length ? approvedPapers.map((paper, index) => (
                    <div className="smart-goals-approved-paper" key={paper.id || `${paper.name || paper.fileName}-${index}`}>
                      <span className="smart-goal-number">{String(index + 1).padStart(2, "0")}</span>
                      <span>{paper.title || paper.name || paper.fileName || "Approved paper"}</span>
                    </div>
                  )) : <p className="smart-goals-approved-empty">Approve and assess RRL papers in Step 2 to use their relevant evidence here.</p>}
                </div>
                <p className="smart-goals-evidence-note">Only concise, gap-relevant excerpts are sent to the AI, not full papers.</p>
              </>
            ) : activeStage === "goals" ? (
              <>
                <div className="workflow-card-header smart-goals-side-header">
                  <div><h2>Objectives</h2><p>Select an objective to refine.</p></div>
                  <span className="smart-goals-count-pill">{generation.goals.length} {generation.goals.length === 1 ? "objective" : "objectives"}</span>
                </div>
                <div className="smart-goals-goal-rail" data-smart-guide="objective-list">
                  {generation.goals.map((goal, index) => (
                    <button className={`smart-goals-goal-tab${activeGoalIndex === index ? " is-active" : ""}`} type="button" key={`goal-${index}`} onClick={() => setActiveGoalIndex(index)}>
                      <span className="smart-goal-number">{String(index + 1).padStart(2, "0")}</span>
                      <span className="smart-goals-goal-tab-copy">
                        <strong title={goal.objective || `Untitled objective ${index + 1}`}>{goal.objective || `Untitled objective ${index + 1}`}</strong>
                        <small><i className={`smart-goals-status-dot${goal.reviewStatus === "accepted" ? " is-complete" : goal.reviewStatus === "declined" ? " is-declined" : " is-needs-input"}`} aria-hidden="true" />{goal.reviewStatus === "accepted" ? "Accepted" : goal.reviewStatus === "declined" ? "Declined" : isGoalComplete(goal) ? "Ready to review" : "Needs input"}</small>
                      </span>
                    </button>
                  ))}
                  <button className="smart-goals-add-goal" type="button" onClick={addGoal}><Plus size={16} aria-hidden="true" />Add objective</button>
                </div>
              </>
            ) : activeStage === "paper" ? (
              <>
                <div className="workflow-card-header smart-goals-side-header">
                  <div><h2>Aligned draft</h2><p>The selected Step 2 introduction and accepted objectives.</p></div>
                  <span className="smart-goals-count-pill">{acceptedGoals.length} accepted</span>
                </div>
                <div className="smart-goals-context-content">
                  <span className="smart-goals-eyebrow">TITLE</span>
                  <p>{generation.researchTitle || groupData.title || "Not specified"}</p>
                  <span className="smart-goals-eyebrow">PRIMARY GAP</span>
                  <p>{generation.selectedGap || selectedGap || "Not specified"}</p>
                </div>
              </>
            ) : (
              <details className="smart-goals-context-details" open>
                <summary className="workflow-card-header smart-goals-side-header">
                  <div><h2>Research context</h2><p>Topic and gap used for this plan.</p></div>
                  <ChevronLeft className="smart-goals-collapse-chevron" size={18} aria-hidden="true" />
                </summary>
                <div className="smart-goals-context-content">
                  <span className="smart-goals-eyebrow">RESEARCH TITLE</span>
                  <p>{researchTitle || groupData.title || "Not specified"}</p>
                  <span className="smart-goals-eyebrow">RESEARCH GAP</span>
                  <p>{selectedGap || "Not specified"}</p>
                  {selectedIntroduction && (
                    <>
                      <span className="smart-goals-eyebrow">LINKED INTRODUCTION</span>
                      <p>{selectedIntroduction.label} ({getWordCount(selectedIntroduction.content)} words)</p>
                    </>
                  )}
                </div>
              </details>
            )}
            {activeStage === "goals" && <p className="smart-goals-context-foot"><span className="smart-goals-context-dot" />Draft autosaved in this browser.</p>}
            {activeStage === "review" && <p className="smart-goals-context-foot"><span className="smart-goals-context-dot" />{approvedPaperCount} approved papers considered.</p>}
          </aside>

          <section className="smart-goals-main-panel" aria-live="polite">
            {activeStage === "plan" && (
              <>
                <div className="workflow-card-header smart-goals-main-header">
                  <div><h2>Study Focus</h2><p>Set the topic and gap these objectives will address.</p></div>
                  <span className="smart-goals-count-pill">Step 1</span>
                </div>
                <p className="smart-goals-panel-description">Generate 3–4 evidence-backed objectives with clear SMART criteria.</p>
                <form onSubmit={handleGenerate}>
                  {/* Linked Introduction Context Card */}
                  <div className="smart-goals-linked-intro-card">
                    <div className="smart-goals-linked-intro-head">
                      <div className="smart-goals-linked-intro-info">
                        <span className="smart-goals-eyebrow">STEP 2 INTRODUCTION CONTEXT</span>
                        <h4>{selectedIntroduction ? selectedIntroduction.label : "No introduction draft linked"}</h4>
                        {selectedIntroduction ? (
                          <small>{formatDraftTime(selectedIntroduction.timestamp)} · {getWordCount(selectedIntroduction.content)} words · {Array.isArray(selectedIntroduction.references) ? selectedIntroduction.references.length : 0} citations</small>
                        ) : (
                          <small>You can link a synthesized introduction to anchor your objectives to literature.</small>
                        )}
                      </div>
                      <div className="smart-goals-linked-intro-actions">
                        {selectedIntroduction && (
                          <button
                            type="button"
                            className="smart-goals-secondary-action"
                            style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                            onClick={() => setPreviewingDraft(selectedIntroduction)}
                          >
                            <Eye size={13} />
                            <span>Preview</span>
                          </button>
                        )}
                        <button
                          type="button"
                          className="smart-goals-secondary-action"
                          style={{ padding: "5px 12px", fontSize: "0.8rem" }}
                          onClick={() => setIsSelectingIntroduction(true)}
                        >
                          <RotateCcw size={13} />
                          <span>{selectedIntroduction ? "Change draft" : "Select draft"}</span>
                        </button>
                      </div>
                    </div>
                    {selectedIntroduction?.content && (
                      <p className="smart-goals-linked-intro-excerpt">
                        {selectedIntroduction.content.slice(0, 220).trim()}...
                      </p>
                    )}
                  </div>

                  <div className="smart-goals-plan-fields" data-smart-guide="study-focus">
                    <label className="smart-goals-field">
                      <span>Research topic / title <small>Required · Step 1</small></span>
                      <textarea className="smart-goals-full-text" rows="2" value={researchTitle} onChange={(event) => setResearchTitle(event.target.value)} placeholder="Enter the research title" />
                    </label>
                    <label className="smart-goals-field">
                      <span>Research gap <small>Required · Step 1</small></span>
                      {gaps.length > 0 ? (
                        <div className="smart-goals-gap-picker">
                          <p className="smart-goals-full-gap">{selectedGap || "Choose a research gap."}</p>
                          <details className="smart-goals-gap-change">
                            <summary>Change selected gap</summary>
                            <select value={selectedGap} onChange={(event) => setSelectedGap(event.target.value)} aria-label="Choose research gap">
                              <option value="">Choose a gap</option>
                              {gaps.map((gap, index) => <option key={`${index}-${gap}`} value={gap}>{gap}</option>)}
                              {!gaps.includes(selectedGap) && selectedGap && <option value={selectedGap}>{selectedGap}</option>}
                            </select>
                          </details>
                        </div>
                      ) : (
                        <textarea className="smart-goals-full-text" rows="3" value={selectedGap} onChange={(event) => setSelectedGap(event.target.value)} placeholder="Describe the research gap you want to address" />
                      )}
                    </label>
                  </div>
                  <div className="smart-goals-guidance-row">
                    <Info size={17} aria-hidden="true" />
                    <span>Unconfirmed targets and deadlines stay open for researcher input.</span>
                  </div>
                  {error && <p className="smart-goals-error" role="alert">{error}</p>}
                  <div className="smart-goals-sticky-bar">
                    <div className="smart-goals-sticky-stats"><strong>{approvedPaperCount}</strong><span>Approved papers</span></div>
                    <div className="smart-goals-sticky-actions">
                      <span>{generation ? "Regenerating replaces the current draft." : "Only relevant evidence excerpts are included."}</span>
                    <button className="smart-goals-generate" type="submit" disabled={isGenerating || !canGenerate} data-smart-guide="generate-goals">
                      {isGenerating ? <LoaderCircle className="smart-goals-spinner" size={17} /> : generation ? <RotateCcw size={17} /> : <Sparkles size={17} />}
                      {isGenerating ? "Building your goals..." : generation ? "Regenerate goals" : "Generate goals"}
                    </button>
                    </div>
                  </div>
                </form>
              </>
            )}

            {activeStage === "goals" && goalsReady && (
              <>
                <div className="workflow-card-header smart-goals-main-header">
                  <div><h2>Edit each SMART objective</h2><p>Refine the aim and six criteria before reviewing your plan.</p></div>
                  <span className="smart-goals-count-pill">{generation.goals.length} {generation.goals.length === 1 ? "objective" : "objectives"}</span>
                </div>
                <label className="smart-goals-field smart-goals-aim">
                  <span>Overall research aim</span>
                  <textarea className="smart-goals-auto-grow" rows="2" value={generation.overallAim || ""} onChange={(event) => setGeneration({ ...generation, overallAim: event.target.value })} />
                </label>
                <div className="smart-goals-studio-layout">
                  {activeGoal && (
                    <article className="smart-goals-goal-editor">
                      <div className="smart-goals-editor-title-row">
                        <div><span className="smart-goals-panel-kicker">OBJECTIVE {String(activeGoalIndex + 1).padStart(2, "0")}</span><h3>{activeGoal.objective || "Untitled objective"}</h3></div>
                        {generation.goals.length > 1 && (pendingDeleteIndex === activeGoalIndex ? (
                          <div className="smart-goals-delete-confirm" role="group" aria-label="Confirm objective deletion">
                            <span>Delete this objective?</span>
                            <button className="smart-goals-confirm-cancel" type="button" onClick={() => setPendingDeleteIndex(null)}>Cancel</button>
                            <button className="smart-goals-confirm-delete" type="button" onClick={() => removeGoal(activeGoalIndex)}>Delete</button>
                          </div>
                        ) : (
                          <button className="smart-goals-icon-action" type="button" title="Delete objective" aria-label="Delete objective" onClick={() => setPendingDeleteIndex(activeGoalIndex)}><Trash2 size={16} /></button>
                        ))}
                      </div>
                      <div className="smart-goals-editor-fields">
                        {GOAL_FIELDS.map(([field, label], index) => (
                          <label className={`smart-goals-field smart-goals-smart-field smart-goals-smart-${field}`} key={field} data-smart-guide={field === "specific" ? "goal-editor" : undefined}>
                            <span><i aria-hidden="true">{label[0]}</i>{label}</span>
                            <small className="smart-goals-field-help">{SMART_FIELD_HELP[field]}</small>
                            <textarea className="smart-goals-auto-grow" rows={field === "objective" ? 2 : 3} value={activeGoal[field] || ""} onChange={(event) => updateGoal(activeGoalIndex, field, event.target.value)} placeholder={`Define the ${label.toLowerCase()} criterion`} />
                          </label>
                        ))}
                      </div>
                      <div className="smart-goals-editor-insights">
                        {activeGoal.needsUserInput?.length > 0 && (
                          <details className="smart-goals-optional-notes">
                            <summary>Optional planning notes ({activeGoal.needsUserInput.length})</summary>
                            <p>These are possible details to consider as your research plan develops. They are not required to complete this objective.</p>
                            <ul>{activeGoal.needsUserInput.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
                          </details>
                        )}
                        <div>
                          <strong>Evidence references</strong>
                          <span className="smart-goals-evidence-count">{activeGoal.sourceRefs?.length ? `${new Set(activeGoal.sourceRefs).size} evidence sources` : "No source reference attached."}</span>
                        </div>
                      </div>
                    </article>
                  )}
                </div>
                <div className="smart-goals-sticky-bar smart-goals-editor-footer">
                  <div className="smart-goals-sticky-stats smart-goals-editor-stats">
                    <span className="smart-goals-saved"><Check size={15} /> Draft autosaved</span>
                    <span><strong>{generation.goals.length}</strong> objectives</span>
                    <span><strong>{totalCriteriaFilled}</strong> / {generation.goals.length * GOAL_FIELDS.length} criteria filled</span>
                  </div>
                  <div className="smart-goals-sticky-actions">
                    <button className="smart-goals-generate" type="button" onClick={() => setActiveStage("review")} data-smart-guide="review-stage"><FileCheck2 size={16} /> Review goals</button>
                  </div>
                </div>
              </>
            )}

            {activeStage === "review" && goalsReady && (
              <>
                <div className="workflow-card-header smart-goals-main-header smart-goals-review-heading">
                  <div><h2>Review your research plan</h2><p>Check the objectives, evidence, and decisions still to confirm.</p></div>
                  <div className="smart-goals-export-actions">
                    <button className="smart-goals-secondary-action" type="button" title="Copy research plan" onClick={copyReview}>{copyStatus ? <Check size={15} aria-hidden="true" /> : <Clipboard size={15} aria-hidden="true" />}{copyStatus || "Copy"}</button>
                    <details className="smart-goals-export-menu">
                      <summary className="workflow-action-button"><Download size={15} aria-hidden="true" />Export<ChevronLeft className="smart-goals-export-chevron" size={14} aria-hidden="true" /></summary>
                      <div className="smart-goals-export-options">
                        <button type="button" onClick={() => exportReview("PDF")}>PDF (.pdf)</button>
                        <button type="button" onClick={() => exportReview("DOCX")}>DOCX (.docx)</button>
                        <button type="button" onClick={() => exportReview("TXT")}>TXT (.txt)</button>
                      </div>
                    </details>
                  </div>
                </div>
                {copyStatus && <div className="smart-goals-toast" role="status"><Check size={14} /> Research plan copied</div>}
                <div className="smart-goals-review-summary">
                  <div><span>RESEARCH TOPIC / TITLE</span><p>{generation.researchTitle || groupData.title || "Not specified"}</p></div>
                  <div><span>RESEARCH GAP</span><p>{generation.selectedGap || selectedGap || "Not specified"}</p></div>
                  <div><span>OVERALL AIM</span><p>{generation.overallAim || "Add an overall aim in Goal Studio."}</p></div>
                </div>
                <p className="smart-goals-grade-note">AI scores below grade the current objective text, including any edits. They are advisory estimates, not proof of correctness. Planning notes are optional and do not block completion. Accept at least three objectives and accept or decline every objective before saving. Declined objectives can be regenerated individually.</p>
                {isReviewEvaluating && <p className="smart-goals-review-grading" role="status"><LoaderCircle className="smart-goals-spinner" size={17} aria-hidden="true" /> Grading the latest objective text…</p>}
                {reviewGradeError && (
                  <div className="smart-goals-review-grade-error" role="alert">
                    <span>{reviewGradeError}</span>
                    <button className="smart-goals-secondary-action" type="button" onClick={() => setReviewGradeError("")}>Retry grading</button>
                  </div>
                )}
                <div className="smart-goals-review-list">
                  {generation.goals.map((goal, index) => {
                    const complete = completedFieldCount(goal);
                    return (
                      <article className={`smart-goals-review-item${goal.reviewStatus === "accepted" ? " is-accepted" : goal.reviewStatus === "declined" ? " is-declined" : ""}`} key={`review-${index}`}>
                        <div className="smart-goals-review-item-head">
                          <span className="smart-goal-number">{String(index + 1).padStart(2, "0")}</span>
                          <div><h3>{goal.objective || `Objective ${index + 1}`}</h3><span>{complete}/6 SMART criteria completed · {goal.reviewStatus === "accepted" ? "Accepted" : goal.reviewStatus === "declined" ? "Declined" : "Awaiting your decision"}</span></div>
                          <button className="smart-goals-edit-button" type="button" onClick={() => { setReviewGradeError(""); setActiveGoalIndex(index); setActiveStage("goals"); }}><Pencil size={14} aria-hidden="true" />Edit</button>
                        </div>
                        <div className="smart-goals-grade-grid">
                          {goal.evaluation && (!goal.evaluationOutdated || reviewGradeError) ? (
                            <>
                              <div className={`smart-goals-score-card ${scoreTone(goal.evaluation.gapAlignmentScore)}`}>
                                <span>GAP ALIGNMENT</span>
                                <strong>{goal.evaluation.gapAlignmentScore}<small>/100</small></strong>
                                <b>{scoreLabel(goal.evaluation.gapAlignmentScore)}</b>
                              </div>
                              <div className={`smart-goals-score-card ${scoreTone(goal.evaluation.smartQualityScore)}`}>
                                <span>SMART QUALITY</span>
                                <strong>{goal.evaluation.smartQualityScore}<small>/100</small></strong>
                                <b>{scoreLabel(goal.evaluation.smartQualityScore)}</b>
                              </div>
                              {goal.evaluation.feedback && <p className="smart-goals-grade-feedback">{goal.evaluation.feedback}</p>}
                            </>
                          ) : isReviewEvaluating ? (
                            <p className="smart-goals-grade-pending">Updating this grade to match the latest objective text…</p>
                          ) : reviewGradeError ? (
                            <p className="smart-goals-grade-pending">Advisory grade unavailable right now. You can retry grading above or continue with your decision below.</p>
                          ) : (
                            <p className="smart-goals-grade-pending">This objective is waiting for its current-text assessment.</p>
                          )}
                        </div>
                        <div className="smart-goals-review-criteria">
                          {GOAL_FIELDS.slice(1).map(([field, label]) => <div key={field}><strong>{label}</strong><p>{renderReviewText(goal[field] || "Not specified yet")}</p></div>)}
                        </div>
                        {(goal.needsUserInput?.length > 0 || (goal.timeBound && /researcher|confirm|determin/i.test(goal.timeBound))) && (
                          <details className="smart-goals-optional-notes">
                            <summary>Optional planning notes</summary>
                            <p>Consider these details as the study develops. They are not required to accept or save this objective.</p>
                            <ul>
                              {(goal.needsUserInput?.length ? goal.needsUserInput : [goal.timeBound]).map((item, itemIndex) => (
                                <li key={`${itemIndex}-${item}`}>{renderReviewText(item)}</li>
                              ))}
                            </ul>
                          </details>
                        )}
                        <div className="smart-goals-review-decisions" role="group" aria-label={`Review objective ${index + 1}`} data-smart-guide={index === 0 ? "review-decisions" : undefined}>
                          <button className={`smart-goals-decision-button is-accept${goal.reviewStatus === "accepted" ? " is-selected" : ""}`} type="button" aria-pressed={goal.reviewStatus === "accepted"} disabled={regeneratingGoalIndex !== null} onClick={() => setGoalReviewStatus(index, "accepted")}><Check size={15} aria-hidden="true" />{goal.reviewStatus === "accepted" ? "Accepted" : "Accept objective"}</button>
                          <button className={`smart-goals-decision-button is-decline${goal.reviewStatus === "declined" ? " is-selected" : ""}`} type="button" aria-pressed={goal.reviewStatus === "declined"} disabled={regeneratingGoalIndex !== null} onClick={() => setGoalReviewStatus(index, "declined")}><X size={15} aria-hidden="true" />{goal.reviewStatus === "declined" ? "Declined" : "Decline"}</button>
                          {goal.reviewStatus === "declined" && (
                            <button
                              className="smart-goals-decision-button is-regenerate"
                              type="button"
                              disabled={regeneratingGoalIndex !== null}
                              onClick={() => regenerateDeclinedGoal(index)}
                            >
                              {regeneratingGoalIndex === index
                                ? <LoaderCircle className="smart-goals-spinner" size={15} aria-hidden="true" />
                                : <RotateCcw size={15} aria-hidden="true" />}
                              {regeneratingGoalIndex === index ? "Regenerating objective..." : "Regenerate this objective"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
                {error && <p className="smart-goals-error" role="alert">{error}</p>}
                <div className="smart-goals-sticky-bar smart-goals-review-footer">
                  <span>{acceptedGoalCount} accepted · {generation.goals.length - reviewedGoalCount} undecided. {acceptedGoalCount < 3 ? `Accept ${3 - acceptedGoalCount} more to save.` : "Verify evidence before use."}</span>
                  <div className="smart-goals-sticky-actions">
                    <button className="smart-goals-secondary-action" type="button" onClick={() => { setReviewGradeError(""); setActiveStage("goals"); }}><Target size={15} aria-hidden="true" />Back to refine</button>
                    <button className="smart-goals-generate" type="button" onClick={handleSaveAndCombine} disabled={isSaving || !canFinishReview} data-smart-guide="save-combine">
                      {isSaving ? <LoaderCircle className="smart-goals-spinner" size={15} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                      {isSaving ? "Saving and combining..." : "Save and combine"}
                    </button>
                  </div>
                </div>
              </>
            )}
            {activeStage === "paper" && goalsReady && (
              <>
                <div className="workflow-card-header smart-goals-main-header smart-goals-review-heading">
                  <div><h2>Research draft</h2><p>Step 2’s selected title/introduction together with the SMART objectives you accepted.</p></div>
                </div>
                <p className="smart-goals-grade-note">This combines your selected introduction with accepted goals; it does not rewrite the introduction. Check the flow and add other paper sections as your study requires.</p>
                <article className="smart-goals-paper-preview">
                  <h1 data-smart-guide="combined-preview">{generation.researchTitle || groupData.title || "Research title"}</h1>
                  <section>
                    <h2>Introduction</h2>
                    {introduction?.content ? (
                      <>
                        <p className="smart-goals-paper-version">{introduction.label || "Selected Step 2 version"}</p>
                        <div className="smart-goals-paper-prose">{introduction.content}</div>
                      </>
                    ) : (
                      <div className="smart-goals-paper-empty">
                        <p>No Step 2 introduction is attached to this SMART Goals draft yet.</p>
                        <button className="smart-goals-edit-button" type="button" onClick={() => navigate(`/citewise/${groupId}`)}>Return to Step 2 and select an introduction version</button>
                      </div>
                    )}
                  </section>
                  <section>
                    <h2>Research gap</h2>
                    <p className="smart-goals-paper-prose">{generation.selectedGap || selectedGap || "Not specified"}</p>
                  </section>
                  <section>
                    <h2>Overall research aim</h2>
                    <p className="smart-goals-paper-prose">{generation.overallAim || "Not specified"}</p>
                  </section>
                  <section>
                    <h2>SMART objectives</h2>
                    {acceptedGoals.length ? acceptedGoals.map((goal, index) => (
                      <article className="smart-goals-paper-objective" key={`paper-goal-${index}`}>
                        <h3>{index + 1}. {goal.objective || "Objective"}</h3>
                        {GOAL_FIELDS.slice(1).map(([field, label]) => (
                          <p key={field}><strong>{label}:</strong> {goal[field] || "Not specified"}</p>
                        ))}
                        {goal.sourceRefs?.length > 0 && <p><strong>Evidence sources:</strong> {goal.sourceRefs.map((sourceId) => paperSourceLabel(approvedPapers, sourceId)).join("; ")}</p>}
                      </article>
                    )) : <p className="smart-goals-paper-empty">Accept at least one objective in Review plan to include it here.</p>}
                  </section>
                  <section>
                    <h2>References</h2>
                    {Array.isArray(introduction?.references) && introduction.references.length > 0 ? (
                      <ol>{introduction.references.map((reference, index) => <li key={`${index}-${reference}`}>{reference}</li>)}</ol>
                    ) : (
                      <p className="smart-goals-paper-empty">No references were attached to the selected introduction.</p>
                    )}
                  </section>
                </article>
                {error && <p className="smart-goals-error" role="alert">{error}</p>}
                <div className="smart-goals-sticky-bar smart-goals-review-footer">
                  <span>{acceptedGoals.length} accepted objectives included · {introduction ? "Step 2 introduction attached" : "Introduction missing"}</span>
                  <div className="smart-goals-sticky-actions">
                    <button className="smart-goals-secondary-action" type="button" onClick={() => setActiveStage("review")}><FileCheck2 size={15} aria-hidden="true" />Back to review</button>
                    <button className="smart-goals-generate" type="button" onClick={handleFinish} data-smart-guide="finish"><Check size={15} aria-hidden="true" />Finish</button>
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* Full draft reader modal */}
      {previewingDraft && (
        <div className="smart-goals-modal-overlay" onClick={() => setPreviewingDraft(null)}>
          <div className="smart-goals-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="smart-goals-modal-header">
              <div>
                <h3>{previewingDraft.label || "Introduction Draft Preview"}</h3>
                <small>{formatDraftTime(previewingDraft.timestamp)} · {getWordCount(previewingDraft.content)} words</small>
              </div>
              <button type="button" className="smart-goals-modal-close" onClick={() => setPreviewingDraft(null)} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>
            <div className="smart-goals-modal-body">
              <div className="smart-goals-modal-text">
                {previewingDraft.content}
              </div>
              {previewingDraft.references?.length > 0 && (
                <div className="smart-goals-modal-references">
                  <h4>References ({previewingDraft.references.length})</h4>
                  <ul>
                    {previewingDraft.references.map((ref, idx) => (
                      <li key={idx}>{ref.raw || ref.title || (typeof ref === "string" ? ref : JSON.stringify(ref))}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="smart-goals-modal-footer">
              <button type="button" className="smart-goals-secondary-action" onClick={() => setPreviewingDraft(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {guideOpen && activeGuideStep && (
        <div className="smart-goals-guide-layer">
          <div className="smart-goals-guide-blocker" aria-hidden="true" />
          {guideSpotlight && (
            <div
              className="smart-goals-guide-spotlight"
              style={{
                top: guideSpotlight.top,
                left: guideSpotlight.left,
                width: guideSpotlight.width,
                height: guideSpotlight.height,
                borderRadius: guideSpotlight.borderRadius,
              }}
              aria-hidden="true"
            />
          )}
          <section className="smart-goals-guide-card" role="dialog" aria-modal="true" aria-labelledby="smart-goals-guide-title" aria-describedby="smart-goals-guide-description">
            <div className="smart-goals-guide-card-header">
              <span>Step {guideStep + 1} of {smartGoalsGuideSteps.length}</span>
              <button type="button" onClick={() => setGuideStep(-1)} aria-label="Close guide"><X size={18} /></button>
            </div>
            <div className="smart-goals-guide-progress" aria-hidden="true">
              <span style={{ width: `${((guideStep + 1) / smartGoalsGuideSteps.length) * 100}%` }} />
            </div>
            <h2 id="smart-goals-guide-title">{activeGuideStep.title}</h2>
            <p id="smart-goals-guide-description">{activeGuideStep.description}</p>
            <div className="smart-goals-guide-actions">
              <button className="smart-goals-guide-skip" type="button" onClick={() => setGuideStep(-1)}>Skip guide</button>
              <div>
                <button className="smart-goals-guide-back" type="button" onClick={() => moveSmartGoalsGuide(-1)} disabled={guideStep === 0}>
                  <ChevronLeft size={16} aria-hidden="true" />Back
                </button>
                <button className="smart-goals-guide-next" type="button" onClick={() => moveSmartGoalsGuide(1)}>
                  {guideStep === smartGoalsGuideSteps.length - 1 ? "Finish" : "Next"}
                  {guideStep < smartGoalsGuideSteps.length - 1 && <ChevronRight size={16} aria-hidden="true" />}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
      {isFinishModalOpen && (
        <div className="smart-goals-finish-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsFinishModalOpen(false);
        }}>
          <section className="smart-goals-finish-modal" role="dialog" aria-modal="true" aria-labelledby="smart-goals-finish-title">
            <header className="smart-goals-finish-modal-header">
              <div>
                <span className="smart-goals-finish-eyebrow">FINAL REVIEW</span>
                <h2 id="smart-goals-finish-title">Your research paper draft</h2>
                <p>Preview the combined paper and download a copy if you need one.</p>
              </div>
              <button type="button" className="smart-goals-finish-close" aria-label="Close final preview" onClick={() => setIsFinishModalOpen(false)}><X size={20} /></button>
            </header>
            <div className="smart-goals-finish-paper">
              <h1>{generation.researchTitle || groupData.title || "Research title"}</h1>
              <section>
                <h3>Introduction</h3>
                {introduction?.content ? (
                  <div className="smart-goals-paper-prose">{introduction.content}</div>
                ) : <p className="smart-goals-paper-empty">No Step 2 introduction was selected.</p>}
              </section>
              <section>
                <h3>Research gap</h3>
                <p className="smart-goals-paper-prose">{generation.selectedGap || selectedGap || "Not specified"}</p>
              </section>
              <section>
                <h3>Overall research aim</h3>
                <p className="smart-goals-paper-prose">{generation.overallAim || "Not specified"}</p>
              </section>
              <section>
                <h3>SMART objectives</h3>
                {acceptedGoals.map((goal, index) => (
                  <div className="smart-goals-finish-objective" key={`finish-goal-${index}`}>
                    <h4>{index + 1}. {goal.objective || "Objective"}</h4>
                    {GOAL_FIELDS.slice(1).map(([field, label]) => (
                      <p key={field}><strong>{label}:</strong> {goal[field] || "Not specified"}</p>
                    ))}
                    {goal.sourceRefs?.length > 0 && (
                      <p><strong>Evidence sources:</strong> {goal.sourceRefs.map((sourceId) => paperSourceLabel(approvedPapers, sourceId)).join("; ")}</p>
                    )}
                  </div>
                ))}
              </section>
              <section>
                <h3>References</h3>
                <ol>{(introduction?.references || []).map((reference, index) => <li key={`${index}-${reference}`}>{reference}</li>)}</ol>
                {!introduction?.references?.length && <p className="smart-goals-paper-empty">No references were attached to the selected introduction.</p>}
              </section>
            </div>
            <div className="smart-goals-finish-download">
              <label className="smart-goals-finish-filename">
                <span>Filename</span>
                <input ref={finishFilenameInput} value={finalFilename} onChange={(event) => setFinalFilename(event.target.value)} placeholder="research-paper" maxLength={120} />
              </label>
              <label className="smart-goals-finish-format">
                <span>File type</span>
                <select value={finalFileFormat} onChange={(event) => setFinalFileFormat(event.target.value)}>
                  <option value="PDF">PDF (.pdf)</option>
                  <option value="DOCX">Word document (.docx)</option>
                </select>
              </label>
              <span className="smart-goals-finish-extension">.{finalFileFormat === "PDF" ? "pdf" : "docx"}</span>
            </div>
            {error && <p className="smart-goals-error" role="alert">{error}</p>}
            <footer className="smart-goals-finish-actions">
              <button className="smart-goals-secondary-action" type="button" onClick={() => setIsFinishModalOpen(false)}>Back to draft</button>
              <div>
                <button className="smart-goals-secondary-action smart-goals-finish-download-button" type="button" onClick={() => exportReview(finalFileFormat, true, finalFilename)}>
                  <Download size={16} aria-hidden="true" />Download {finalFileFormat === "PDF" ? "PDF" : "Word"}
                </button>
                <button className="smart-goals-generate" type="button" onClick={completeSmartGoals}><Check size={16} aria-hidden="true" />Finish</button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}