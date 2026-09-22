"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  Filter,
  HardHat,
  Home,
  Landmark,
  ListTodo,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Mic,
  Network,
  Paperclip,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Ruler,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  activeUser,
  changedSince,
  draftEmail,
  exportWorkspace,
  generateCallBrief,
  generateHandoff,
  generateProposalBrief,
  importWorkspace,
  loadContacts,
  makeDocument,
  makeInteraction,
  makeTask,
  markSeen,
  nextOpenTask,
  previousLastSeen,
  pullCloud,
  pushCloud,
  relationshipDepth,
  saveContacts,
  setActiveUser,
  setTeamCode,
  teamCode,
  uid,
} from "@/lib/relationship-store";
import {
  PIPELINE_LABELS,
  STAGE_LABELS,
  TEAM_MEMBERS,
  type CapitalProfile,
  type ContactDocument,
  type Interaction,
  type Pipeline,
  type RelationshipContact,
  type RelationshipStage,
  type TeamMemberId,
} from "@/lib/relationship-types";

type View = "home" | "contacts" | "capital" | "tasks" | "documents" | "network" | "activity";
type GeneratedDoc = {
  title: string;
  content: string;
  type: ContactDocument["type"];
  subject?: string;
  emailBody?: string;
};

type SpeechResultListLike = {
  length: number;
  [key: number]: {
    [key: number]: {
      transcript: string;
    };
  };
};

type SpeechEventLike = {
  results: SpeechResultListLike;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const STAGES = Object.keys(STAGE_LABELS) as RelationshipStage[];
const PIPELINES = Object.keys(PIPELINE_LABELS) as Pipeline[];

function prettyDate(value?: string | null, includeTime = false) {
  if (!value) return "Not set";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", includeTime
    ? { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
    : { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function compactDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(value));
}

function isDue(value?: string | null) {
  if (!value) return false;
  const due = new Date(value);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return due <= end;
}

function validPhone(value: string) {
  return value.replace(/\D/g, "").length >= 7;
}

function phoneHref(value: string) {
  return "tel:" + value.replace(/[^+\d]/g, "");
}

function textHref(value: string) {
  return "sms:" + value.replace(/[^+\d]/g, "");
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
}

function pipelineIcon(pipeline: Pipeline) {
  if (pipeline === "capital") return <Landmark />;
  if (pipeline === "architect") return <Ruler />;
  return <HardHat />;
}

function capitalBadge(profile?: CapitalProfile) {
  if (!profile) return "Not capital";
  if (/broker|introducer|representative/i.test(profile.directness)) return "Intermediary";
  if (/direct|managed|authorized/i.test(profile.directness)) return "Direct / managed";
  return "Needs verification";
}

export function Dashboard() {
  const [contacts, setContacts] = useState<RelationshipContact[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View>("home");
  const [query, setQuery] = useState("");
  const [pipelineFilter, setPipelineFilter] = useState<Pipeline | "all">("all");
  const [stageFilter, setStageFilter] = useState<RelationshipStage | "all">("all");
  const [member, setMember] = useState<TeamMemberId>("paul");
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [listening, setListening] = useState(false);
  const [generated, setGenerated] = useState<GeneratedDoc | null>(null);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [cloudCode, setCloudCode] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [newContact, setNewContact] = useState({
    name: "",
    organization: "",
    title: "",
    email: "",
    phone: "",
    pipeline: "capital" as Pipeline,
    nextAction: "",
  });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      const loaded = loadContacts();
      setContacts(loaded);
      setSelectedId(loaded[0]?.id || "");
      setMember(activeUser());
      setCloudCode(teamCode());
      setLastSeen(previousLastSeen());
    }, 0);
    const seenTimer = window.setTimeout(markSeen, 3000);
    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(seenTimer);
    };
  }, []);

  const selected = contacts.find((contact) => contact.id === selectedId) || null;

  const persist = (next: RelationshipContact[]) => {
    setContacts(next);
    saveContacts(next);
  };

  const patchContact = (
    id: string,
    changes: Partial<RelationshipContact>,
    interaction?: Interaction,
  ) => {
    const next = contacts.map((contact) => {
      if (contact.id !== id) return contact;
      return {
        ...contact,
        ...changes,
        interactions: interaction ? [...contact.interactions, interaction] : contact.interactions,
      };
    });
    persist(next);
  };

  const mutateContact = (id: string, transform: (contact: RelationshipContact) => RelationshipContact) => {
    persist(contacts.map((contact) => contact.id === id ? transform(contact) : contact));
  };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return contacts
      .filter((contact) => {
        const forcedCapital = view === "capital";
        const pipelineMatch = forcedCapital
          ? contact.pipeline === "capital"
          : pipelineFilter === "all" || contact.pipeline === pipelineFilter;
        const stageMatch = stageFilter === "all" || contact.stage === stageFilter;
        const haystack = [
          contact.name,
          contact.organization,
          contact.title,
          contact.email,
          contact.phone,
          contact.category,
          contact.professionalThemes,
          contact.publicObservation,
          contact.alignmentTags.join(" "),
        ].join(" ").toLowerCase();
        return pipelineMatch && stageMatch && (!needle || haystack.includes(needle));
      })
      .sort((a, b) => {
        const priority = { A: 3, B: 2, C: 1 } as Record<string, number>;
        return (priority[b.priority] || 0) - (priority[a.priority] || 0) || b.score - a.score;
      });
  }, [contacts, pipelineFilter, query, stageFilter, view]);

  useEffect(() => {
    if (view !== "contacts" && view !== "capital") return;
    if (!filtered.length || filtered.some((contact) => contact.id === selectedId)) return;
    const timer = window.setTimeout(() => setSelectedId(filtered[0].id), 0);
    return () => window.clearTimeout(timer);
  }, [filtered, selectedId, view]);

  const metrics = useMemo(() => ({
    total: contacts.length,
    capital: contacts.filter((c) => c.pipeline === "capital").length,
    architects: contacts.filter((c) => c.pipeline === "architect").length,
    contractors: contacts.filter((c) => c.pipeline === "contractor").length,
    due: contacts.reduce((sum, c) => sum + c.tasks.filter((t) => !["done", "canceled"].includes(t.status) && isDue(t.dueAt)).length, 0),
    qualified: contacts.filter((c) => ["qualified", "call", "nda", "diligence", "proposal", "active", "won"].includes(c.stage)).length,
  }), [contacts]);

  const changed = useMemo(() => changedSince(contacts, lastSeen), [contacts, lastSeen]);

  const openTasks = useMemo(() => {
    return contacts.flatMap((contact) =>
      contact.tasks
        .filter((task) => !["done", "canceled"].includes(task.status))
        .map((task) => ({ contact, task })),
    ).sort((a, b) => {
      if (!a.task.dueAt && !b.task.dueAt) return b.task.createdAt.localeCompare(a.task.createdAt);
      if (!a.task.dueAt) return 1;
      if (!b.task.dueAt) return -1;
      return a.task.dueAt.localeCompare(b.task.dueAt);
    });
  }, [contacts]);

  const allDocuments = useMemo(() => {
    return contacts.flatMap((contact) =>
      contact.documents.map((document) => ({ contact, document })),
    ).sort((a, b) => b.document.createdAt.localeCompare(a.document.createdAt));
  }, [contacts]);

  const allActivity = useMemo(() => {
    return contacts.flatMap((contact) =>
      contact.interactions.map((interaction) => ({ contact, interaction })),
    ).sort((a, b) => b.interaction.at.localeCompare(a.interaction.at));
  }, [contacts]);

  const chooseUser = (id: TeamMemberId) => {
    setMember(id);
    setActiveUser(id);
  };

  const openContact = (contact: RelationshipContact) => {
    setSelectedId(contact.id);
    setView(contact.pipeline === "capital" && view === "capital" ? "capital" : "contacts");
    setMenuOpen(false);
  };

  const logInteraction = (type: Interaction["type"], summary: string, transcript?: string) => {
    if (!selected) return;
    patchContact(selected.id, {}, makeInteraction(member, type, summary, transcript));
  };

  const updateStage = (stage: RelationshipStage) => {
    if (!selected || stage === selected.stage) return;
    patchContact(
      selected.id,
      { stage },
      makeInteraction(member, "status", "Stage changed from " + STAGE_LABELS[selected.stage] + " to " + STAGE_LABELS[stage] + "."),
    );
  };

  const addTask = () => {
    if (!selected) return;
    const title = window.prompt("What needs to happen next?", selected.nextAction || "");
    if (!title?.trim()) return;
    const due = window.prompt("Due date (YYYY-MM-DD), or leave blank", "");
    const assignee = window.prompt("Assign to: paul, mark, or jonathan", member)?.toLowerCase();
    const assignedTo: TeamMemberId = assignee === "mark" || assignee === "jonathan" ? assignee : "paul";
    const task = makeTask(
      title.trim(),
      assignedTo,
      member,
      due && !Number.isNaN(Date.parse(due)) ? new Date(due + "T17:00:00").toISOString() : null,
    );
    mutateContact(selected.id, (contact) => ({
      ...contact,
      nextAction: title.trim(),
      nextActionDue: task.dueAt || contact.nextActionDue,
      tasks: [...contact.tasks, task],
      interactions: [...contact.interactions, makeInteraction(member, "task", "Created task: " + title.trim())],
    }));
    toast.success("Task added");
  };

  const completeTask = (contactId: string, taskId: string) => {
    const contact = contacts.find((item) => item.id === contactId);
    const task = contact?.tasks.find((item) => item.id === taskId);
    if (!contact || !task) return;
    const completedAt = new Date().toISOString();
    mutateContact(contactId, (item) => ({
      ...item,
      tasks: item.tasks.map((entry) => entry.id === taskId ? { ...entry, status: "done", completedAt } : entry),
      interactions: [...item.interactions, makeInteraction(member, "task", "Completed task: " + task.title)],
      nextAction: item.nextAction === task.title ? "" : item.nextAction,
      nextActionDue: item.nextAction === task.title ? null : item.nextActionDue,
    }));
    toast.success("Task completed");
  };

  const completePrimaryAction = () => {
    if (!selected) return;
    const task = nextOpenTask(selected);
    if (task) {
      completeTask(selected.id, task.id);
      return;
    }
    if (!selected.nextAction) return;
    patchContact(
      selected.id,
      { nextAction: "", nextActionDue: null },
      makeInteraction(member, "task", "Completed next action: " + selected.nextAction),
    );
    toast.success("Next action completed");
  };

  const addDocumentLink = () => {
    if (!selected) return;
    const title = window.prompt("Document title");
    if (!title?.trim()) return;
    const url = window.prompt("Document URL (optional)", "") || "";
    const confidentiality = window.prompt("Confidentiality: public, internal, confidential, restricted", "internal");
    const safe = confidentiality === "public" || confidentiality === "confidential" || confidentiality === "restricted"
      ? confidentiality
      : "internal";
    const document = makeDocument(title.trim(), "other", safe, member, undefined, url);
    mutateContact(selected.id, (contact) => ({
      ...contact,
      documents: [...contact.documents, document],
      interactions: [...contact.interactions, makeInteraction(member, "document", "Added document: " + document.title)],
    }));
    toast.success("Document attached");
  };

  const addConnection = () => {
    if (!selected) return;
    const target = window.prompt("Who is this contact connected to? Enter a person or company name.");
    if (!target?.trim()) return;
    const match = contacts.find((contact) =>
      contact.id !== selected.id &&
      (contact.name.toLowerCase().includes(target.toLowerCase()) || contact.organization.toLowerCase().includes(target.toLowerCase())),
    );
    if (!match) {
      toast.error("No matching contact found");
      return;
    }
    const relationship = window.prompt("Relationship: introduced, represents, partner, referred, works_with, broker_for, other", "introduced") || "other";
    const allowed = ["introduced", "works_with", "represents", "partner", "invested_with", "broker_for", "architect_for", "contractor_for", "referred", "other"];
    const type = allowed.includes(relationship) ? relationship as RelationshipContact["connections"][number]["relationship"] : "other";
    mutateContact(selected.id, (contact) => ({
      ...contact,
      connections: [...contact.connections, {
        id: uid("connection"),
        contactId: match.id,
        relationship: type,
        createdBy: member,
        createdAt: new Date().toISOString(),
      }],
      interactions: [...contact.interactions, makeInteraction(member, "introduction", "Connected to " + match.name + " — " + type.replaceAll("_", " ") + ".")],
    }));
    toast.success("Connection added");
  };

  const showGenerated = (kind: "handoff" | "call" | "proposal" | "email") => {
    if (!selected) return;
    if (kind === "handoff") {
      setGenerated({ title: "Handoff — " + selected.name, content: generateHandoff(selected), type: "handoff" });
    } else if (kind === "call") {
      setGenerated({ title: "Call Brief — " + selected.name, content: generateCallBrief(selected), type: "call_brief" });
    } else if (kind === "proposal") {
      setGenerated({ title: "Proposal Working Brief — " + selected.name, content: generateProposalBrief(selected), type: "proposal" });
    } else {
      const draft = draftEmail(selected);
      setGenerated({
        title: "Email — " + selected.name,
        content: "SUBJECT: " + draft.subject + "\n\n" + draft.body,
        type: "email",
        subject: draft.subject,
        emailBody: draft.body,
      });
    }
  };

  const saveGenerated = () => {
    if (!selected || !generated) return;
    const confidentiality = generated.type === "proposal" && selected.pipeline === "capital" ? "confidential" : "internal";
    const document = makeDocument(generated.title, generated.type, confidentiality, member, generated.content);
    mutateContact(selected.id, (contact) => ({
      ...contact,
      documents: [...contact.documents, document],
      interactions: [...contact.interactions, makeInteraction(member, "document", "Created " + generated.title + ".")],
    }));
    toast.success("Saved to contact file");
  };

  const emailGenerated = () => {
    if (!selected || !generated?.emailBody) return;
    const href = "mailto:" + encodeURIComponent(selected.email) +
      "?subject=" + encodeURIComponent(generated.subject || "") +
      "&body=" + encodeURIComponent(generated.emailBody);
    window.location.href = href;
  };

  const startVoice = () => {
    setVoiceOpen(true);
    setVoiceText("");
    const browser = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) {
      toast.info("Live browser transcription is unavailable here. Type or paste the voice-note transcript instead.");
      return;
    }
    const recognition = new Constructor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript + " ";
      }
      setVoiceText(transcript.trim());
    };
    recognition.onerror = () => {
      setListening(false);
      toast.error("Voice transcription stopped. You can still type the note.");
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const saveVoice = () => {
    if (!selected || !voiceText.trim()) return;
    stopVoice();
    const summary = voiceText.trim().length > 180 ? voiceText.trim().slice(0, 177) + "..." : voiceText.trim();
    patchContact(selected.id, {}, makeInteraction(member, "voice", summary, voiceText.trim()));
    setVoiceOpen(false);
    setVoiceText("");
    toast.success("Voice note logged", { description: "It is now part of the relationship timeline." });
  };

  const createQuickContact = () => {
    if (!newContact.name.trim() && !newContact.organization.trim()) return;
    const contact: RelationshipContact = {
      id: uid("contact"),
      name: newContact.name.trim() || newContact.organization.trim(),
      organization: newContact.organization.trim(),
      title: newContact.title.trim(),
      pipeline: newContact.pipeline,
      category: "",
      email: newContact.email.trim(),
      phone: newContact.phone.trim(),
      website: "",
      linkedin: "",
      location: "",
      priority: "B",
      score: 0,
      stage: "new",
      nextAction: newContact.nextAction.trim(),
      nextActionDue: null,
      publicObservation: "",
      outreachHook: "",
      professionalThemes: "",
      materialFit: "",
      sourceUrl: "",
      verificationUrl: "",
      emailConfidence: "UNVERIFIED",
      researchDepth: "Quick add",
      warnings: "",
      alignmentTags: [],
      owner: member,
      interactions: [makeInteraction(member, "note", "Contact added to the network.")],
      tasks: [],
      documents: [],
      connections: [],
      ...(newContact.pipeline === "capital" ? {
        capital: {
          capitalType: "Unknown",
          directness: "Unknown",
          decisionMakerStatus: "Unknown",
          entityStatus: "Pending",
          mandate: "",
          sizeRange: "",
          capacityStatus: "Not requested",
          disclosureLevel: "Public only",
          ndaStatus: "Not started",
          diligenceStatus: "Not started",
          riskFlags: "",
        },
      } : {}),
    };
    persist([contact, ...contacts]);
    setSelectedId(contact.id);
    setView(newContact.pipeline === "capital" ? "capital" : "contacts");
    setQuickAddOpen(false);
    setNewContact({ name: "", organization: "", title: "", email: "", phone: "", pipeline: "capital", nextAction: "" });
    toast.success("Contact added");
  };

  const importBackup = async (file?: File) => {
    if (!file) return;
    try {
      const imported = await importWorkspace(file);
      persist(imported);
      setSelectedId(imported[0]?.id || "");
      toast.success(imported.length + " contacts loaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed.");
    } finally {
      if (importRef.current) importRef.current.value = "";
    }
  };

  const pullFromCloud = async () => {
    setCloudBusy(true);
    try {
      setTeamCode(cloudCode);
      const result = await pullCloud();
      if (!result.length) {
        toast.info("Cloud workspace is empty", { description: "Use Push local to cloud to seed it." });
      } else {
        persist(result);
        setSelectedId(result[0]?.id || "");
        toast.success("Cloud workspace loaded");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cloud sync failed.");
    } finally {
      setCloudBusy(false);
    }
  };

  const pushToCloud = async () => {
    setCloudBusy(true);
    try {
      setTeamCode(cloudCode);
      await pushCloud(contacts);
      toast.success("Workspace pushed to cloud");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cloud sync failed.");
    } finally {
      setCloudBusy(false);
    }
  };

  const swipe = (endX: number) => {
    if (touchStart == null || filtered.length < 2) return;
    const delta = endX - touchStart;
    setTouchStart(null);
    if (Math.abs(delta) < 60) return;
    const index = Math.max(0, filtered.findIndex((contact) => contact.id === selectedId));
    const nextIndex = delta < 0
      ? Math.min(filtered.length - 1, index + 1)
      : Math.max(0, index - 1);
    setSelectedId(filtered[nextIndex].id);
  };

  const nav = [
    { id: "home" as const, label: "Today", icon: <Home /> },
    { id: "contacts" as const, label: "Contacts", icon: <Users /> },
    { id: "capital" as const, label: "Capital", icon: <CircleDollarSign /> },
    { id: "tasks" as const, label: "Tasks", icon: <ListTodo /> },
    { id: "documents" as const, label: "Documents", icon: <FileText /> },
    { id: "network" as const, label: "Network", icon: <Network /> },
    { id: "activity" as const, label: "Activity", icon: <Activity /> },
  ];

  return (
    <div className="relationship-app">
      <Toaster richColors position="bottom-right" />
      <aside className={menuOpen ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <strong>Relationship OS</strong>
            <span>Capital · Architects · Contractors</span>
          </div>
          <button className="mobile-close" onClick={() => setMenuOpen(false)}><X /></button>
        </div>

        <nav className="main-nav">
          {nav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => { setView(item.id); setMenuOpen(false); }}
            >
              {item.icon}<span>{item.label}</span>
              {item.id === "tasks" && metrics.due > 0 ? <em>{metrics.due}</em> : null}
            </button>
          ))}
        </nav>

        <div className="sidebar-team">
          <span>Working as</span>
          {(Object.keys(TEAM_MEMBERS) as TeamMemberId[]).map((id) => (
            <button key={id} className={member === id ? "active" : ""} onClick={() => chooseUser(id)}>
              <i style={{ background: TEAM_MEMBERS[id].color }}>{TEAM_MEMBERS[id].initials}</i>
              <strong>{TEAM_MEMBERS[id].name}</strong>
              {member === id ? <Check /> : null}
            </button>
          ))}
        </div>

        <button className="settings-button" onClick={() => setSettingsOpen(true)}>
          <Settings /> Settings & sync
        </button>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="top-title">
            <span>UNIFIED RELATIONSHIP NETWORK</span>
            <strong>{view === "home" ? "What’s next?" : nav.find((item) => item.id === view)?.label}</strong>
          </div>
          <div className="topbar-actions">
            <div className="team-legend">
              {(Object.keys(TEAM_MEMBERS) as TeamMemberId[]).map((id) => (
                <span key={id} title={TEAM_MEMBERS[id].name} style={{ background: TEAM_MEMBERS[id].color }}>
                  {TEAM_MEMBERS[id].initials}
                </span>
              ))}
            </div>
            <button className="icon-action" onClick={() => setQuickAddOpen(true)} title="Add contact"><Plus /></button>
            <button className="primary-action" onClick={() => selected ? startVoice() : setView("contacts")}>
              <Mic /> <span>Voice update</span>
            </button>
          </div>
        </header>

        <main className="main-content">
          {view === "home" ? (
            <HomeView
              contacts={contacts}
              metrics={metrics}
              changed={changed}
              tasks={openTasks}
              onOpen={openContact}
              onCompleteTask={completeTask}
              onGo={(next) => setView(next)}
            />
          ) : null}

          {(view === "contacts" || view === "capital") ? (
            <div className="contacts-workspace">
              <section className="contacts-list-panel">
                <div className="list-toolbar">
                  <div className="search-input">
                    <Search />
                    <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search people, firms, tags, notes…" />
                  </div>
                  <div className="filter-row">
                    <Filter />
                    {view !== "capital" ? (
                      <select value={pipelineFilter} onChange={(event) => setPipelineFilter(event.target.value as Pipeline | "all")}>
                        <option value="all">All pipelines</option>
                        {PIPELINES.map((pipeline) => <option key={pipeline} value={pipeline}>{PIPELINE_LABELS[pipeline]}</option>)}
                      </select>
                    ) : null}
                    <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as RelationshipStage | "all")}>
                      <option value="all">All stages</option>
                      {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
                    </select>
                  </div>
                  <div className="list-summary"><strong>{filtered.length}</strong> contacts</div>
                </div>

                <div className="contact-list">
                  {filtered.map((contact) => {
                    const task = nextOpenTask(contact);
                    return (
                      <button key={contact.id} className={selectedId === contact.id ? "contact-row selected" : "contact-row"} onClick={() => setSelectedId(contact.id)}>
                        <span className={"pipeline-avatar " + contact.pipeline}>{initials(contact.name || contact.organization)}</span>
                        <span className="row-copy">
                          <span className="row-heading"><strong>{contact.name}</strong><em className={"stage stage-" + contact.stage}>{STAGE_LABELS[contact.stage]}</em></span>
                          <span>{contact.organization}{contact.title ? " · " + contact.title : ""}</span>
                          <small>{task?.title || contact.nextAction || contact.category || "No next action"}</small>
                        </span>
                        <ChevronRight />
                      </button>
                    );
                  })}
                  {!filtered.length ? <div className="empty-list"><Search /><strong>No contacts match</strong><span>Change the search or filters.</span></div> : null}
                </div>
              </section>

              <section
                className="contact-detail-panel"
                onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
                onTouchEnd={(event) => swipe(event.changedTouches[0].clientX)}
              >
                {selected ? (
                  <ContactDetail
                    contact={selected}
                    contacts={contacts}
                    filtered={filtered}
                    onSelect={setSelectedId}
                    onStage={updateStage}
                    onPatch={(changes) => patchContact(selected.id, changes)}
                    onVoice={startVoice}
                    onComplete={completePrimaryAction}
                    onTask={addTask}
                    onDocument={addDocumentLink}
                    onConnection={addConnection}
                    onGenerate={showGenerated}
                    onLog={logInteraction}
                  />
                ) : (
                  <div className="empty-detail"><UserRound /><strong>Select a contact</strong><span>The relationship file will appear here.</span></div>
                )}
              </section>
            </div>
          ) : null}

          {view === "tasks" ? (
            <TasksView tasks={openTasks} member={member} onOpen={openContact} onComplete={completeTask} />
          ) : null}

          {view === "documents" ? (
            <DocumentsView rows={allDocuments} onOpen={openContact} />
          ) : null}

          {view === "network" ? (
            <NetworkView contacts={contacts} onOpen={openContact} />
          ) : null}

          {view === "activity" ? (
            <ActivityView rows={allActivity} onOpen={openContact} />
          ) : null}
        </main>
      </div>

      {voiceOpen ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setVoiceOpen(false); }}>
          <div className="modal voice-modal">
            <div className="modal-head">
              <div><Mic /><span><strong>Voice update</strong><small>{selected ? selected.name + " · " + selected.organization : "Select a contact first"}</small></span></div>
              <button onClick={() => { stopVoice(); setVoiceOpen(false); }}><X /></button>
            </div>
            <div className={listening ? "voice-orb listening" : "voice-orb"}><Mic /></div>
            <p>{listening ? "Listening — speak naturally." : "Use live transcription if supported, or type/paste the note below."}</p>
            <textarea value={voiceText} onChange={(event) => setVoiceText(event.target.value)} placeholder="Example: I just talked to Brian. He needs the teaser, a follow-up email, and a call Wednesday. He says he represents the money but I’m not sure he is the principal…" />
            <div className="modal-actions">
              <button className="secondary" onClick={listening ? stopVoice : startVoice}>{listening ? "Stop listening" : "Start listening"}</button>
              <button className="primary" disabled={!selected || !voiceText.trim()} onClick={saveVoice}>Save to timeline</button>
            </div>
          </div>
        </div>
      ) : null}

      {quickAddOpen ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setQuickAddOpen(false); }}>
          <div className="modal">
            <div className="modal-head">
              <div><Plus /><span><strong>Quick add contact</strong><small>Capture the essentials now; enrich later.</small></span></div>
              <button onClick={() => setQuickAddOpen(false)}><X /></button>
            </div>
            <div className="form-grid">
              <label><span>Name</span><input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} /></label>
              <label><span>Organization</span><input value={newContact.organization} onChange={(e) => setNewContact({ ...newContact, organization: e.target.value })} /></label>
              <label><span>Title / role</span><input value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} /></label>
              <label><span>Pipeline</span><select value={newContact.pipeline} onChange={(e) => setNewContact({ ...newContact, pipeline: e.target.value as Pipeline })}>
                {PIPELINES.map((pipeline) => <option key={pipeline} value={pipeline}>{PIPELINE_LABELS[pipeline]}</option>)}
              </select></label>
              <label><span>Email</span><input value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} /></label>
              <label><span>Phone</span><input value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} /></label>
              <label className="full"><span>Why / next action</span><input value={newContact.nextAction} onChange={(e) => setNewContact({ ...newContact, nextAction: e.target.value })} /></label>
            </div>
            <div className="modal-actions"><button className="secondary" onClick={() => setQuickAddOpen(false)}>Cancel</button><button className="primary" onClick={createQuickContact}>Add contact</button></div>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
          <div className="modal settings-modal">
            <div className="modal-head">
              <div><Settings /><span><strong>Settings & sync</strong><small>Team identity, backups and shared-cloud handoff.</small></span></div>
              <button onClick={() => setSettingsOpen(false)}><X /></button>
            </div>

            <section className="settings-section">
              <h3>Team identity</h3>
              <div className="member-cards">
                {(Object.keys(TEAM_MEMBERS) as TeamMemberId[]).map((id) => (
                  <button key={id} className={member === id ? "active" : ""} onClick={() => chooseUser(id)}>
                    <i style={{ background: TEAM_MEMBERS[id].color }}>{TEAM_MEMBERS[id].initials}</i>
                    <span><strong>{TEAM_MEMBERS[id].name}</strong><small>Same access · color attribution</small></span>
                    {member === id ? <CheckCircle2 /> : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="settings-section">
              <h3>Shared cloud</h3>
              <p>The app is fully usable locally now. Shared sync activates after a backend is configured for this deployment. The team code is kept only in this browser session.</p>
              <label className="stacked-label"><span>Team access code</span><input type="password" value={cloudCode} onChange={(e) => setCloudCode(e.target.value)} placeholder="Enter deployment team code" /></label>
              <div className="button-row">
                <button className="secondary" disabled={cloudBusy} onClick={pullFromCloud}><RefreshCw /> Pull cloud</button>
                <button className="secondary" disabled={cloudBusy} onClick={pushToCloud}><Upload /> Push local to cloud</button>
              </div>
            </section>

            <section className="settings-section">
              <h3>Backup / restore</h3>
              <p>Export includes all contacts, interactions, tasks, documents metadata, capital qualification and network links.</p>
              <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={(e) => void importBackup(e.target.files?.[0])} />
              <div className="button-row">
                <button className="secondary" onClick={() => exportWorkspace(contacts)}><Download /> Export backup</button>
                <button className="secondary" onClick={() => importRef.current?.click()}><Upload /> Import backup</button>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {generated ? (
        <div className="modal-backdrop document-modal-wrap" onMouseDown={(event) => { if (event.target === event.currentTarget) setGenerated(null); }}>
          <div className="modal document-modal">
            <div className="modal-head">
              <div><Sparkles /><span><strong>{generated.title}</strong><small>Working draft · human review required</small></span></div>
              <button onClick={() => setGenerated(null)}><X /></button>
            </div>
            <textarea className="document-editor" value={generated.content} onChange={(event) => setGenerated({ ...generated, content: event.target.value })} />
            <div className="modal-actions document-actions">
              <button className="secondary" onClick={() => navigator.clipboard.writeText(generated.content).then(() => toast.success("Copied"))}><Copy /> Copy</button>
              <button className="secondary" onClick={() => window.print()}><Printer /> Print / PDF</button>
              <button className="secondary" onClick={saveGenerated}><FilePlus2 /> Save to contact</button>
              {generated.emailBody && selected?.email ? <button className="primary" onClick={emailGenerated}><Mail /> Open email</button> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function HomeView({
  contacts,
  metrics,
  changed,
  tasks,
  onOpen,
  onCompleteTask,
  onGo,
}: {
  contacts: RelationshipContact[];
  metrics: { total: number; capital: number; architects: number; contractors: number; due: number; qualified: number };
  changed: ReturnType<typeof changedSince>;
  tasks: { contact: RelationshipContact; task: RelationshipContact["tasks"][number] }[];
  onOpen: (contact: RelationshipContact) => void;
  onCompleteTask: (contactId: string, taskId: string) => void;
  onGo: (view: View) => void;
}) {
  const highIntent = contacts
    .filter((contact) => contact.pipeline === "capital" && ["replied", "verification", "qualified", "call", "nda", "diligence", "proposal", "active"].includes(contact.stage))
    .slice(0, 5);
  const due = tasks.filter(({ task }) => isDue(task.dueAt)).slice(0, 8);
  const recent = changed.slice(0, 7);

  return (
    <div className="home-view">
      <section className="hero-card">
        <div>
          <span>DAILY OPERATING VIEW</span>
          <h1>Who needs attention next?</h1>
          <p>One shared relationship brain for Paul, Mark and Jonathan. Calls, notes, tasks, documents and capital verification stay attached to the person.</p>
        </div>
        <div className="hero-number"><strong>{metrics.total}</strong><span>live contacts</span></div>
      </section>

      <div className="metric-grid">
        <button onClick={() => onGo("capital")}><Landmark /><span><strong>{metrics.capital}</strong>Capital</span></button>
        <button onClick={() => onGo("contacts")}><Ruler /><span><strong>{metrics.architects}</strong>Architects</span></button>
        <button onClick={() => onGo("contacts")}><HardHat /><span><strong>{metrics.contractors}</strong>Contractors</span></button>
        <button onClick={() => onGo("tasks")} className={metrics.due ? "attention" : ""}><Clock3 /><span><strong>{metrics.due}</strong>Due now</span></button>
        <button onClick={() => onGo("capital")}><ShieldCheck /><span><strong>{metrics.qualified}</strong>Qualified / active</span></button>
      </div>

      <div className="home-grid">
        <section className="home-card">
          <div className="card-head"><div><CalendarClock /><span><strong>Due / overdue</strong><small>Do these next</small></span></div><button onClick={() => onGo("tasks")}>All tasks <ArrowUpRight /></button></div>
          <div className="action-list">
            {due.length ? due.map(({ contact, task }) => (
              <div key={task.id} className="action-item">
                <button className="action-copy" onClick={() => onOpen(contact)}>
                  <span className={"pipeline-dot " + contact.pipeline}>{pipelineIcon(contact.pipeline)}</span>
                  <span><strong>{task.title}</strong><small>{contact.name} · {contact.organization} · {task.dueAt ? compactDate(task.dueAt) : "No date"}</small></span>
                </button>
                <button className="complete-circle" onClick={() => onCompleteTask(contact.id, task.id)} title="Complete"><Check /></button>
              </div>
            )) : <EmptyMini icon={<CheckCircle2 />} title="Nothing urgent" text="No dated tasks are due today." />}
          </div>
        </section>

        <section className="home-card">
          <div className="card-head"><div><Activity /><span><strong>What changed?</strong><small>Since your last visit</small></span></div><button onClick={() => onGo("activity")}>Activity <ArrowUpRight /></button></div>
          <div className="change-list">
            {recent.length ? recent.map((row) => (
              <button key={row.at + row.contact.id + row.summary} onClick={() => onOpen(row.contact)}>
                <i style={{ background: row.userId ? TEAM_MEMBERS[row.userId].color : "#94a3b8" }} />
                <span><strong>{row.summary}</strong><small>{row.contact.name} · {prettyDate(row.at, true)}</small></span>
              </button>
            )) : <EmptyMini icon={<Activity />} title="No new logged changes" text="New calls, notes and tasks will show here." />}
          </div>
        </section>

        <section className="home-card capital-watch">
          <div className="card-head"><div><CircleDollarSign /><span><strong>Capital watch</strong><small>High-intent / verification</small></span></div><button onClick={() => onGo("capital")}>Capital <ArrowUpRight /></button></div>
          <div className="capital-list">
            {highIntent.length ? highIntent.map((contact) => (
              <button key={contact.id} onClick={() => onOpen(contact)}>
                <span className="avatar-small">{initials(contact.name)}</span>
                <span><strong>{contact.name}</strong><small>{contact.organization} · {capitalBadge(contact.capital)}</small></span>
                <em className={"stage stage-" + contact.stage}>{STAGE_LABELS[contact.stage]}</em>
              </button>
            )) : <EmptyMini icon={<ShieldCheck />} title="No high-intent capital yet" text="Replies and qualified contacts will surface here." />}
          </div>
        </section>

        <section className="home-card pipeline-card">
          <div className="card-head"><div><BriefcaseBusiness /><span><strong>Network composition</strong><small>216 researched contacts loaded</small></span></div></div>
          <div className="pipeline-bars">
            {([
              ["capital", metrics.capital, metrics.total],
              ["architect", metrics.architects, metrics.total],
              ["contractor", metrics.contractors, metrics.total],
            ] as [Pipeline, number, number][]).map(([pipeline, count, total]) => (
              <div key={pipeline}>
                <span><strong>{PIPELINE_LABELS[pipeline]}</strong><em>{count}</em></span>
                <i><b className={pipeline} style={{ width: Math.max(2, (count / total) * 100) + "%" }} /></i>
              </div>
            ))}
          </div>
          <p>The working contact seed was migrated from the Notion Outreach Intelligence System: 62 capital, 68 architects and 86 contractors/builders.</p>
        </section>
      </div>
    </div>
  );
}

function ContactDetail({
  contact,
  contacts,
  filtered,
  onSelect,
  onStage,
  onPatch,
  onVoice,
  onComplete,
  onTask,
  onDocument,
  onConnection,
  onGenerate,
  onLog,
}: {
  contact: RelationshipContact;
  contacts: RelationshipContact[];
  filtered: RelationshipContact[];
  onSelect: (id: string) => void;
  onStage: (stage: RelationshipStage) => void;
  onPatch: (changes: Partial<RelationshipContact>) => void;
  onVoice: () => void;
  onComplete: () => void;
  onTask: () => void;
  onDocument: () => void;
  onConnection: () => void;
  onGenerate: (kind: "handoff" | "call" | "proposal" | "email") => void;
  onLog: (type: Interaction["type"], summary: string, transcript?: string) => void;
}) {
  const depth = relationshipDepth(contact);
  const primaryTask = nextOpenTask(contact);
  const timeline = [...contact.interactions].sort((a, b) => b.at.localeCompare(a.at));
  const index = filtered.findIndex((item) => item.id === contact.id);
  const phoneOk = validPhone(contact.phone);
  const connected = contact.connections.map((connection) => ({
    connection,
    contact: contacts.find((item) => item.id === connection.contactId),
  })).filter((row) => row.contact);

  const patchCapital = (changes: Partial<CapitalProfile>) => {
    if (!contact.capital) return;
    onPatch({ capital: { ...contact.capital, ...changes } });
  };

  return (
    <div className="contact-detail">
      <div className="mobile-deck-nav">
        <button disabled={index <= 0} onClick={() => onSelect(filtered[Math.max(0, index - 1)]?.id || contact.id)}><ChevronLeft /></button>
        <span>{index + 1} / {filtered.length} · swipe between contacts</span>
        <button disabled={index >= filtered.length - 1} onClick={() => onSelect(filtered[Math.min(filtered.length - 1, index + 1)]?.id || contact.id)}><ChevronRight /></button>
      </div>

      <header className="contact-hero">
        <div className={"contact-avatar " + contact.pipeline}>{initials(contact.name)}</div>
        <div className="contact-title">
          <div className="eyebrow-line">
            <span className={"pipeline-label " + contact.pipeline}>{pipelineIcon(contact.pipeline)} {PIPELINE_LABELS[contact.pipeline]}</span>
            <span className="priority-label">Priority {contact.priority || "—"}</span>
            <span className="depth-label">{depth.label} relationship</span>
          </div>
          <h1>{contact.name}</h1>
          <p>{contact.title || contact.category}{contact.organization ? " · " + contact.organization : ""}</p>
          {contact.location ? <small><MapPin /> {contact.location}</small> : null}
        </div>
        <div className="stage-control">
          <span>Relationship stage</span>
          <select value={contact.stage} onChange={(event) => onStage(event.target.value as RelationshipStage)}>
            {STAGES.map((stage) => <option key={stage} value={stage}>{STAGE_LABELS[stage]}</option>)}
          </select>
        </div>
      </header>

      <div className="quick-actions">
        {phoneOk ? <a href={phoneHref(contact.phone)}><Phone /><span>Call</span></a> : <button disabled><Phone /><span>Call</span></button>}
        {phoneOk ? <a href={textHref(contact.phone)}><MessageCircle /><span>Text</span></a> : <button disabled><MessageCircle /><span>Text</span></button>}
        {contact.email ? <a href={"mailto:" + contact.email}><Mail /><span>Email</span></a> : <button disabled><Mail /><span>Email</span></button>}
        <button onClick={onVoice}><Mic /><span>Voice note</span></button>
        <button onClick={() => onGenerate("email")}><Sparkles /><span>Draft email</span></button>
        <button onClick={onComplete} className="complete-action" disabled={!primaryTask && !contact.nextAction}><CheckCircle2 /><span>Done</span></button>
      </div>

      <div className="detail-body">
        <section className="next-action-card">
          <div className="section-head">
            <div><TargetIcon /><span><strong>Next best action</strong><small>The one thing nobody should have to guess</small></span></div>
            <button onClick={onTask}><Plus /> Add task</button>
          </div>
          <div className="next-action-edit">
            <input value={contact.nextAction} onChange={(e) => onPatch({ nextAction: e.target.value })} placeholder="What needs to happen next?" />
            <input type="date" value={contact.nextActionDue ? contact.nextActionDue.slice(0, 10) : ""} onChange={(e) => onPatch({ nextActionDue: e.target.value ? new Date(e.target.value + "T17:00:00").toISOString() : null })} />
          </div>
          {primaryTask ? <div className="task-chip"><span style={{ background: TEAM_MEMBERS[primaryTask.assignedTo].color }}>{TEAM_MEMBERS[primaryTask.assignedTo].initials}</span><strong>{primaryTask.title}</strong><small>{primaryTask.dueAt ? "Due " + prettyDate(primaryTask.dueAt) : "No due date"}</small></div> : null}
        </section>

        <section>
          <div className="section-head">
            <div><UserRound /><span><strong>Relationship file</strong><small>Identity and direct actions</small></span></div>
            {contact.notionUrl ? <a href={contact.notionUrl} target="_blank" rel="noreferrer">Notion <ExternalLink /></a> : null}
          </div>
          <div className="identity-grid">
            <Info label="Organization" value={contact.organization} icon={<Building2 />} />
            <Info label="Role" value={contact.title || contact.category} icon={<BriefcaseBusiness />} />
            <Info label="Email" value={contact.email || "No published email"} icon={<Mail />} href={contact.email ? "mailto:" + contact.email : undefined} />
            <Info label="Phone / route" value={contact.phone || "Not recorded"} icon={<Phone />} href={phoneOk ? phoneHref(contact.phone) : undefined} />
            <Info label="Website" value={contact.website || "Not recorded"} icon={<ExternalLink />} href={contact.website || undefined} external />
            <Info label="Contact confidence" value={contact.emailConfidence || "Not recorded"} icon={<ShieldCheck />} />
          </div>
        </section>

        <section>
          <div className="section-head"><div><Sparkles /><span><strong>Why this contact</strong><small>Public facts and professional fit</small></span></div></div>
          <div className="context-card">
            <label>Public observation</label>
            <p>{contact.publicObservation || "No public observation saved yet."}</p>
          </div>
          <div className="context-grid">
            <div><label>Outreach hook</label><p>{contact.outreachHook || "Not yet defined."}</p></div>
            <div><label>Professional themes</label><p>{contact.professionalThemes || "Not yet defined."}</p></div>
            <div><label>Material / project fit</label><p>{contact.materialFit || "Not yet defined."}</p></div>
            <div><label>Warnings / framing</label><p>{contact.warnings || "No warning recorded."}</p></div>
          </div>
          {contact.alignmentTags.length ? <div className="tag-row">{contact.alignmentTags.map((tag) => <span key={tag}>{tag}</span>)}</div> : null}
        </section>

        {contact.pipeline === "capital" && contact.capital ? (
          <section className="capital-panel">
            <div className="section-head">
              <div><ShieldCheck /><span><strong>Capital qualification</strong><small>Responsive does not mean qualified capital</small></span></div>
              <em>{capitalBadge(contact.capital)}</em>
            </div>
            <div className="qualification-grid">
              <label><span>Capital type</span><input value={contact.capital.capitalType} onChange={(e) => patchCapital({ capitalType: e.target.value })} /></label>
              <label><span>Direct / intermediary</span><select value={contact.capital.directness} onChange={(e) => patchCapital({ directness: e.target.value })}>
                {["Unknown", "Direct principal", "Managed capital", "Authorized professional", "Representative", "Broker", "Introducer", "Network / platform"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>Decision-maker</span><select value={contact.capital.decisionMakerStatus} onChange={(e) => patchCapital({ decisionMakerStatus: e.target.value as CapitalProfile["decisionMakerStatus"] })}>
                {["Unknown", "Not the decision-maker", "Decision-maker claimed", "Decision-maker confirmed"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>Capacity / proof</span><select value={contact.capital.capacityStatus} onChange={(e) => patchCapital({ capacityStatus: e.target.value as CapitalProfile["capacityStatus"] })}>
                {["Not requested", "Requested", "Received", "Under review", "Verified", "Insufficient / unclear"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>Disclosure level</span><select value={contact.capital.disclosureLevel} onChange={(e) => patchCapital({ disclosureLevel: e.target.value })}>
                {["Public only", "Public teaser", "Selected transaction info", "Confidential proposal", "Data room"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>NDA</span><select value={contact.capital.ndaStatus} onChange={(e) => patchCapital({ ndaStatus: e.target.value as CapitalProfile["ndaStatus"] })}>
                {["Not started", "Requested", "Sent", "Signed", "Not required"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>Diligence</span><select value={contact.capital.diligenceStatus} onChange={(e) => patchCapital({ diligenceStatus: e.target.value as CapitalProfile["diligenceStatus"] })}>
                {["Not started", "Initial", "Active", "Complete", "Stopped"].map((value) => <option key={value}>{value}</option>)}
              </select></label>
              <label><span>Entity check</span><input value={contact.capital.entityStatus} onChange={(e) => patchCapital({ entityStatus: e.target.value })} /></label>
              <label className="wide"><span>Mandate</span><textarea value={contact.capital.mandate} onChange={(e) => patchCapital({ mandate: e.target.value })} /></label>
              <label><span>Public size / range</span><input value={contact.capital.sizeRange} onChange={(e) => patchCapital({ sizeRange: e.target.value })} /></label>
              <label className="wide risk-field"><span>Risk / verification notes</span><textarea value={contact.capital.riskFlags} onChange={(e) => patchCapital({ riskFlags: e.target.value })} /></label>
            </div>
            <div className="disclosure-ladder">
              {["Public", "Teaser", "Selected info", "Confidential", "Data room"].map((label, i) => {
                const current = contact.capital?.disclosureLevel.toLowerCase() || "";
                const active = i === 0 || (i === 1 && current.includes("teaser")) || (i === 2 && current.includes("selected")) || (i === 3 && current.includes("confidential")) || (i === 4 && current.includes("data room"));
                return <span key={label} className={active ? "active" : ""}>{i + 1}<em>{label}</em></span>;
              })}
            </div>
          </section>
        ) : null}

        <section>
          <div className="section-head">
            <div><FileText /><span><strong>Documents & actions</strong><small>Create, attach and preserve versions</small></span></div>
            <button onClick={onDocument}><Paperclip /> Attach link</button>
          </div>
          <div className="document-actions-grid">
            <button onClick={() => onGenerate("handoff")}><Clipboard /><span><strong>Handoff summary</strong><small>Who they are, history, risks, next step</small></span></button>
            <button onClick={() => onGenerate("call")}><Phone /><span><strong>Call brief</strong><small>Context and unresolved questions</small></span></button>
            <button onClick={() => onGenerate("proposal")}><FilePlus2 /><span><strong>Create proposal</strong><small>Build a working brief from this file</small></span></button>
            <button onClick={() => onGenerate("email")}><Mail /><span><strong>Draft email</strong><small>Pipeline-specific message from context</small></span></button>
          </div>
          <div className="document-list">
            {contact.documents.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((document) => (
              <div key={document.id}>
                <FileText />
                <span><strong>{document.title}</strong><small>{document.type.replaceAll("_", " ")} · {document.confidentiality} · v{document.version} · {prettyDate(document.createdAt)}</small></span>
                {document.url ? <a href={document.url} target="_blank" rel="noreferrer"><ExternalLink /></a> : null}
              </div>
            ))}
            {!contact.documents.length ? <p className="empty-inline">No documents attached yet.</p> : null}
          </div>
        </section>

        <section>
          <div className="section-head">
            <div><Network /><span><strong>Connections</strong><small>Who introduced whom and how the network grows</small></span></div>
            <button onClick={onConnection}><Plus /> Add connection</button>
          </div>
          <div className="connection-list">
            {connected.map(({ connection, contact: linked }) => linked ? (
              <button key={connection.id} onClick={() => onSelect(linked.id)}>
                <span className={"pipeline-avatar mini " + linked.pipeline}>{initials(linked.name)}</span>
                <span><strong>{linked.name}</strong><small>{connection.relationship.replaceAll("_", " ")} · {linked.organization}</small></span>
                <ChevronRight />
              </button>
            ) : null)}
            {!connected.length ? <p className="empty-inline">No relationship links yet. Add introductions as they happen.</p> : null}
          </div>
        </section>

        <section>
          <div className="section-head">
            <div><Activity /><span><strong>Relationship timeline</strong><small>Calls, emails, voice notes, documents and decisions</small></span></div>
            <button onClick={() => {
              const note = window.prompt("Quick note");
              if (note?.trim()) onLog("note", note.trim());
            }}><Plus /> Note</button>
          </div>
          <div className="timeline">
            {timeline.map((item) => (
              <div key={item.id} className="timeline-item">
                <i style={{ background: TEAM_MEMBERS[item.userId].color }} />
                <span className="timeline-icon">{item.type === "voice" ? <Mic /> : item.type === "call" ? <Phone /> : item.type === "email" ? <Mail /> : item.type === "document" ? <FileText /> : <Activity />}</span>
                <span className="timeline-copy">
                  <span><strong>{TEAM_MEMBERS[item.userId].name}</strong><em>{item.type.replaceAll("_", " ")}</em><small>{prettyDate(item.at, true)}</small></span>
                  <p>{item.summary}</p>
                  {item.transcript && item.transcript !== item.summary ? <details><summary>Full transcript</summary><p>{item.transcript}</p></details> : null}
                </span>
              </div>
            ))}
            {!timeline.length ? <div className="empty-timeline"><Activity /><strong>No interactions logged yet</strong><span>The relationship history starts with the first call, note or email.</span></div> : null}
          </div>
        </section>

        <section className="source-section">
          <div className="section-head"><div><ShieldCheck /><span><strong>Research provenance</strong><small>Keep the source trail visible</small></span></div></div>
          <div className="source-links">
            {contact.sourceUrl ? <a href={contact.sourceUrl} target="_blank" rel="noreferrer">Primary source <ExternalLink /></a> : null}
            {contact.verificationUrl ? <a href={contact.verificationUrl} target="_blank" rel="noreferrer">Verification <ExternalLink /></a> : null}
            {contact.website ? <a href={contact.website} target="_blank" rel="noreferrer">Website <ExternalLink /></a> : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function TasksView({
  tasks,
  member,
  onOpen,
  onComplete,
}: {
  tasks: { contact: RelationshipContact; task: RelationshipContact["tasks"][number] }[];
  member: TeamMemberId;
  onOpen: (contact: RelationshipContact) => void;
  onComplete: (contactId: string, taskId: string) => void;
}) {
  return (
    <div className="page-view">
      <PageHero icon={<ListTodo />} eyebrow="EXECUTION" title="Tasks & handoffs" text="Every request becomes a concrete next step tied to the relationship." />
      <div className="task-board">
        <section>
          <div className="page-card-head"><span>Assigned to {TEAM_MEMBERS[member].name}</span><strong>{tasks.filter(({ task }) => task.assignedTo === member).length}</strong></div>
          {tasks.filter(({ task }) => task.assignedTo === member).map(({ contact, task }) => (
            <TaskRow key={task.id} contact={contact} task={task} onOpen={onOpen} onComplete={onComplete} />
          ))}
        </section>
        <section>
          <div className="page-card-head"><span>All open tasks</span><strong>{tasks.length}</strong></div>
          {tasks.map(({ contact, task }) => (
            <TaskRow key={task.id} contact={contact} task={task} onOpen={onOpen} onComplete={onComplete} />
          ))}
          {!tasks.length ? <EmptyMini icon={<CheckCircle2 />} title="Task queue clear" text="Add tasks from any contact record." /> : null}
        </section>
      </div>
    </div>
  );
}

function TaskRow({
  contact,
  task,
  onOpen,
  onComplete,
}: {
  contact: RelationshipContact;
  task: RelationshipContact["tasks"][number];
  onOpen: (contact: RelationshipContact) => void;
  onComplete: (contactId: string, taskId: string) => void;
}) {
  return (
    <div className={isDue(task.dueAt) ? "task-row due" : "task-row"}>
      <button className="task-open" onClick={() => onOpen(contact)}>
        <i style={{ background: TEAM_MEMBERS[task.assignedTo].color }}>{TEAM_MEMBERS[task.assignedTo].initials}</i>
        <span><strong>{task.title}</strong><small>{contact.name} · {contact.organization} · {task.dueAt ? prettyDate(task.dueAt) : "No due date"}</small></span>
      </button>
      <button className="complete-circle" onClick={() => onComplete(contact.id, task.id)}><Check /></button>
    </div>
  );
}

function DocumentsView({
  rows,
  onOpen,
}: {
  rows: { contact: RelationshipContact; document: ContactDocument }[];
  onOpen: (contact: RelationshipContact) => void;
}) {
  return (
    <div className="page-view">
      <PageHero icon={<FileText />} eyebrow="RELATIONSHIP MEMORY" title="Documents" text="Proposals, teasers, NDAs, proof/capacity records, briefs and generated working documents stay attached to the contact." />
      <section className="table-card">
        <div className="table-header docs"><span>Document</span><span>Contact</span><span>Confidentiality</span><span>Created</span></div>
        {rows.map(({ contact, document }) => (
          <button className="table-row docs" key={document.id} onClick={() => onOpen(contact)}>
            <span><FileText /><b>{document.title}</b></span>
            <span>{contact.name}<small>{contact.organization}</small></span>
            <span><em className={"conf conf-" + document.confidentiality}>{document.confidentiality}</em></span>
            <span>{prettyDate(document.createdAt)}</span>
          </button>
        ))}
        {!rows.length ? <EmptyMini icon={<FileText />} title="No relationship documents yet" text="Create a handoff, proposal, call brief or attach a link from a contact record." /> : null}
      </section>
    </div>
  );
}

function NetworkView({
  contacts,
  onOpen,
}: {
  contacts: RelationshipContact[];
  onOpen: (contact: RelationshipContact) => void;
}) {
  const connections = contacts.flatMap((contact) => contact.connections.map((connection) => ({
    source: contact,
    target: contacts.find((item) => item.id === connection.contactId),
    connection,
  }))).filter((row) => row.target);
  const connectedIds = new Set(connections.flatMap((row) => [row.source.id, row.target?.id || ""]));
  const top = contacts
    .map((contact) => ({ contact, count: contact.connections.length + connections.filter((row) => row.target?.id === contact.id).length }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <div className="page-view">
      <PageHero icon={<Network />} eyebrow="NETWORK INTELLIGENCE" title="Relationship graph" text="Track introductions, representation and referral paths instead of treating every person as an isolated row." />
      <div className="network-grid">
        <section className="network-map">
          <div className="network-center"><Network /><strong>{connectedIds.size}</strong><span>connected contacts</span></div>
          {top.map(({ contact, count }, index) => {
            const angle = (Math.PI * 2 * index) / Math.max(1, top.length);
            const x = 50 + Math.cos(angle) * 37;
            const y = 50 + Math.sin(angle) * 38;
            return (
              <button key={contact.id} className={"network-node " + contact.pipeline} style={{ left: x + "%", top: y + "%" }} onClick={() => onOpen(contact)}>
                <span>{initials(contact.name)}</span><em>{count}</em>
              </button>
            );
          })}
          {!top.length ? <div className="network-empty">Add connections from contact records to build the graph.</div> : null}
        </section>
        <section className="network-edges">
          <div className="page-card-head"><span>Connection log</span><strong>{connections.length}</strong></div>
          {connections.slice(0, 50).map(({ source, target, connection }) => target ? (
            <button key={connection.id} onClick={() => onOpen(source)}>
              <span className={"pipeline-avatar mini " + source.pipeline}>{initials(source.name)}</span>
              <span><strong>{source.name}</strong><small>{connection.relationship.replaceAll("_", " ")} → {target.name}</small></span>
              <ChevronRight />
            </button>
          ) : null)}
          {!connections.length ? <EmptyMini icon={<Network />} title="No links yet" text="When someone introduces another person, save the connection once and keep it forever." /> : null}
        </section>
      </div>
    </div>
  );
}

function ActivityView({
  rows,
  onOpen,
}: {
  rows: { contact: RelationshipContact; interaction: Interaction }[];
  onOpen: (contact: RelationshipContact) => void;
}) {
  return (
    <div className="page-view">
      <PageHero icon={<Activity />} eyebrow="AUDITABLE HISTORY" title="Team activity" text="Every important relationship update is timestamped and attributed by color." />
      <section className="activity-page-list">
        {rows.slice(0, 200).map(({ contact, interaction }) => (
          <button key={interaction.id} onClick={() => onOpen(contact)}>
            <i style={{ background: TEAM_MEMBERS[interaction.userId].color }} />
            <span><strong>{interaction.summary}</strong><small>{TEAM_MEMBERS[interaction.userId].name} · {contact.name} · {contact.organization} · {prettyDate(interaction.at, true)}</small></span>
            <ChevronRight />
          </button>
        ))}
        {!rows.length ? <EmptyMini icon={<Activity />} title="No activity yet" text="Calls, notes, tasks, documents and stage changes will appear here." /> : null}
      </section>
    </div>
  );
}

function PageHero({ icon, eyebrow, title, text }: { icon: ReactNode; eyebrow: string; title: string; text: string }) {
  return (
    <header className="page-hero">
      <div className="page-hero-icon">{icon}</div>
      <div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div>
    </header>
  );
}

function Info({
  label,
  value,
  icon,
  href,
  external,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="info-item">
      <span>{icon}</span>
      <div><label>{label}</label>{href ? <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{value}</a> : <strong>{value}</strong>}</div>
    </div>
  );
}

function EmptyMini({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="empty-mini">{icon}<strong>{title}</strong><span>{text}</span></div>;
}

function TargetIcon() {
  return <Sparkles />;
}
