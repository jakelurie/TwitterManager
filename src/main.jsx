import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  LayoutDashboard,
  CalendarDays,
  Images,
  MessageCircle,
  History,
  SlidersHorizontal,
  Sparkles,
  Pause,
  Play,
  Upload,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Clock,
  Link2,
  Target,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  Video,
  ExternalLink,
  LoaderCircle,
  Feather,
  CheckCheck,
  AlertCircle,
  BarChart3,
  Menu,
  FolderOpen,
  Send,
  Settings2,
} from "lucide-react";
import "./style.css";

const tabs = [
  ["Overview", LayoutDashboard],
  ["Schedule", CalendarDays],
  ["Media bucket", Images],
  ["Replies", MessageCircle],
  ["History", History],
  ["Control center", SlidersHorizontal],
];
async function api(url, method = "GET", body) {
  const res = await fetch("/api" + url, {
    method,
    headers:
      body instanceof FormData ? {} : { "Content-Type": "application/json" },
    body: body
      ? body instanceof FormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
const date = (v, opts = {}) =>
  new Date(v).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...opts,
  });
const localInput = (v) => {
  const d = new Date(v);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function Badge({ children, type = "" }) {
  return <span className={"badge " + type}>{children}</span>;
}
function Empty({ icon: Icon = FolderOpen, title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
function Media({ item, ...props }) {
  return !item ? (
    <div className="media-missing">
      <ImageIcon />
    </div>
  ) : item.mime.startsWith("video/") ? (
    <video src={item.url} muted playsInline preload="metadata" {...props} />
  ) : (
    <img
      src={item.url}
      alt={item.notes || item.name}
      loading="lazy"
      {...props}
    />
  );
}
function App() {
  const [s, setS] = useState(null),
    [tab, setTab] = useState("Overview"),
    [toast, setToast] = useState(null),
    [busy, setBusy] = useState(""),
    [modal, setModal] = useState(null),
    [mobile, setMobile] = useState(false),
    [filter, setFilter] = useState("All media"),
    [postFilter, setPostFilter] = useState("Upcoming"),
    [drag, setDrag] = useState(false);
  const input = useRef();
  useEffect(() => {
    api("/state")
      .then(setS)
      .catch((e) => setToast({ error: true, text: e.message }));
    const timer = setInterval(
      () =>
        api("/state")
          .then(setS)
          .catch(() => {}),
      15000,
    );
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    const fn = (e) => {
      if (e.key === "Escape") {
        setModal(null);
        setMobile(false);
      }
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  async function run(name, url, method = "POST", body, success) {
    if (busy) return;
    setBusy(name);
    try {
      const data = await api(url, method, body);
      setS(data);
      if (success) setToast({ text: success });
      return true;
    } catch (e) {
      setToast({ error: true, text: e.message });
      return false;
    } finally {
      setBusy("");
    }
  }
  async function upload(files) {
    if (!files?.length) return;
    const form = new FormData();
    for (const f of files) form.append("files", f);
    if (
      await run(
        "Uploading",
        "/media",
        "POST",
        form,
        "Media added to your bucket.",
      )
    )
      setTab("Media bucket");
    if (input.current) input.current.value = "";
  }
  const go = (t) => {
    setTab(t);
    setMobile(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const newDraft = async (m) => {
    if (
      await run(
        "Creating draft",
        "/posts",
        "POST",
        { mediaId: m.id },
        "Draft created. Add a caption to make it yours.",
      )
    ) {
      setTab("Schedule");
      setModal(null);
    }
  };
  if (!s)
    return (
      <div className="loading">
        <Feather size={34} />
        <h2>Perch</h2>
        <p>{toast?.text || "Opening your workspace…"}</p>
        {toast && <button onClick={() => location.reload()}>Try again</button>}
      </div>
    );
  const upcoming = s.posts
    .filter((p) => !["published", "cancelled"].includes(p.status))
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const published = s.posts.filter((p) => p.status === "published");
  const used = new Set(
    s.posts.filter((p) => p.status !== "cancelled").map((p) => p.mediaId),
  );
  const available = s.media.filter((m) => !used.has(m.id));
  const totalImpressions = published.reduce(
    (n, p) => n + (p.metrics?.impression_count || 0),
    0,
  );
  const interactions = published.reduce(
    (n, p) =>
      n +
      (p.metrics?.like_count || 0) +
      (p.metrics?.reply_count || 0) +
      (p.metrics?.retweet_count || 0),
    0,
  );
  const mediaFor = (p) => s.media.find((m) => m.id === p.mediaId);
  const planning = busy === "Generating plan" || s.busy.planning;
  const planButton = (
    <button
      className="btn primary"
      disabled={!!busy || planning}
      onClick={() =>
        run(
          "Generating plan",
          "/plan",
          "POST",
          {},
          "Your new plan is ready to review.",
        )
      }
    >
      <Sparkles size={16} />
      {planning ? "Planning…" : "Generate plan"}
    </button>
  );
  const editPost = (p) => setModal({ type: "post", item: p });
  function PostCard({ p, compact = false }) {
    return (
      <article className={"post-card " + (compact ? "compact" : "")}>
        <div className="post-media" onClick={() => editPost(p)}>
          <Media item={mediaFor(p)} />
          <span className="media-kind">
            {mediaFor(p)?.mime.startsWith("video/") ? (
              <Video size={13} />
            ) : (
              <ImageIcon size={13} />
            )}
          </span>
        </div>
        <div className="post-content">
          <div className="post-meta">
            <Badge
              type={
                p.status === "approved"
                  ? "green"
                  : p.status === "draft"
                    ? "amber"
                    : ""
              }
            >
              {p.status === "approved"
                ? "Scheduled"
                : p.status === "draft"
                  ? "Needs review"
                  : p.status}
            </Badge>
            <button
              className="icon-btn"
              aria-label="Edit post"
              onClick={() => editPost(p)}
            >
              <MoreHorizontal size={19} />
            </button>
          </div>
          <p className="caption">
            {p.caption ||
              "Your next story starts here. Add a caption to this draft."}
          </p>
          <div className="post-time">
            <Clock size={13} />
            {date(p.scheduledAt)}
          </div>
          {!compact && (
            <div className="reason">
              <Sparkles size={14} />
              <span>{p.reason}</span>
            </div>
          )}
          <div className="post-footer">
            <span>
              {p.source === "ai" ? (
                <>
                  <Sparkles size={12} /> AI planned
                </>
              ) : (
                <>
                  <Feather size={12} /> Your draft
                </>
              )}
            </span>
            <button onClick={() => editPost(p)}>
              {p.status === "approved" ? "View post" : "Review post"}
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </article>
    );
  }
  return (
    <div className="app">
      <input
        ref={input}
        className="hidden"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime"
        onChange={(e) => upload(e.target.files)}
      />
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Overview");
          }}
        >
          <span className="brand-icon">
            <Feather size={24} />
          </span>
          perch<span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav>
          {tabs.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => go(name)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {name === "Replies" &&
                s.replies.filter((r) => ["new", "review"].includes(r.status))
                  .length > 0 && (
                  <b>
                    {
                      s.replies.filter((r) =>
                        ["new", "review"].includes(r.status),
                      ).length
                    }
                  </b>
                )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="quiet-card">
            <span className="little-star">
              <Sparkles size={17} />
            </span>
            <h4>
              A little less posting.
              <br />A lot more possibility.
            </h4>
            <p>
              You bring the stories.
              <br />
              Perch helps them take flight.
            </p>
          </div>
          <button
            className="account-switch"
            onClick={() => go("Control center")}
          >
            <div className="avatar">
              {s.account?.username?.slice(0, 1).toUpperCase() || "J"}
            </div>
            <div>
              <strong>
                {s.account ? "@" + s.account.username : "Your X account"}
              </strong>
              <span>
                <i className={s.account ? "dot green-dot" : "dot"} />
                {s.account ? "Connected" : "Not connected"}
              </span>
            </div>
            <Settings2 size={16} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-btn"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{tab}</strong>
          </div>
          <div className="topbar-right">
            <span className="local-tag">
              <span className="dot green-dot" />
              Private workspace
            </span>
            <button
              className="avatar small"
              aria-label="Open account settings"
              onClick={() => go("Control center")}
            >
              {s.account?.username?.slice(0, 1).toUpperCase() || "J"}
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "Overview"
                  ? "A LITTLE INTENTION. MORE CONNECTION."
                  : "YOUR X WORKSPACE"}
              </div>
              <h1>
                {tab === "Overview"
                  ? "Good things take a little perch."
                  : tab === "Media bucket"
                    ? "Your stories, ready to go."
                    : tab === "Schedule"
                      ? "A plan with room for you."
                      : tab === "Replies"
                        ? "Keep the conversation going."
                        : tab === "History"
                          ? "Every decision, in the open."
                          : "You set the direction."}
              </h1>
              <p>
                {tab === "Overview"
                  ? "Your content, your voice. A thoughtful plan to help your account grow."
                  : tab === "Media bucket"
                    ? "Drop in the moments. Give your planner something worth sharing."
                    : tab === "Schedule"
                      ? "See what’s next, understand why, and make it your own."
                      : tab === "Replies"
                        ? "Thoughtful replies, reviewed by you before they’re sent."
                        : tab === "History"
                          ? "A running record of what happened and why."
                          : "A few simple controls. An account that still feels like you."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="btn"
                onClick={() => input.current.click()}
                disabled={!!busy}
              >
                <Upload size={15} />
                Upload media
              </button>
              {planButton}
            </div>
          </div>
          {tab === "Overview" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <Badge type="hero-badge">
                    <span className="dot" />
                    {s.settings.autopilot
                      ? "YOUR PLAN IS IN MOTION"
                      : "A CALMER WAY TO GROW"}
                  </Badge>
                  <h2>
                    Bring your ideas.
                    <br />
                    We’ll find their moment.
                  </h2>
                  <p>
                    {s.settings.goal ||
                      "Give Perch a goal and a bucket of photos or videos. Build a considered posting plan, without the daily guesswork."}
                  </p>
                  <button
                    className="btn dark"
                    onClick={() =>
                      go(s.settings.goal ? "Schedule" : "Control center")
                    }
                  >
                    {s.settings.goal
                      ? "Explore your plan"
                      : "Set your direction"}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-spark spark-one">✧</div>
                  <div className="art-spark spark-two">✳</div>
                  <div className="float-note">
                    <span className="note-icon">
                      <ImageIcon size={18} />
                    </span>
                    <div>
                      <strong>A moment worth sharing</strong>
                      <small>From your media bucket</small>
                    </div>
                    <Check size={16} />
                  </div>
                  <div className="illustration-card">
                    <div className="illustration-landscape">
                      <div className="sun" />
                      <div className="hill hill-back" />
                      <div className="hill hill-front" />
                      <span className="tiny-bird">⌁</span>
                    </div>
                    <div className="illustration-caption">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="illustration-footer">
                      <span>
                        <Clock size={11} /> The right moment
                      </span>
                      <Sparkles size={13} />
                    </div>
                  </div>
                  <div className="float-pill">
                    <span className="dot green-dot" />A little more intentional.
                  </div>
                </div>
              </section>
              <div className="stats-grid">
                <Stat
                  label="In the queue"
                  value={upcoming.length.toString().padStart(2, "0")}
                  detail={`${upcoming.filter((p) => p.status === "draft").length} waiting for your review`}
                  icon={CalendarDays}
                />
                <Stat
                  label="Ready to share"
                  value={available.length.toString().padStart(2, "0")}
                  detail="Unused photos & videos"
                  icon={Images}
                />
                <Stat
                  label="Posts published"
                  value={published.length.toString().padStart(2, "0")}
                  detail="Sent through Perch"
                  icon={Send}
                />
                <Stat
                  label="Engagement rate"
                  value={
                    totalImpressions
                      ? `${((interactions / totalImpressions) * 100).toFixed(1)}%`
                      : "—"
                  }
                  detail={
                    totalImpressions
                      ? `${totalImpressions.toLocaleString()} measured impressions`
                      : "Appears after your first sync"
                  }
                  icon={BarChart3}
                />
              </div>
              <div className="overview-grid">
                <section className="next-section">
                  <div className="section-title">
                    <div>
                      <h2>
                        Next on the calendar{" "}
                        <span className="count">{upcoming.length}</span>
                      </h2>
                      <p>A little planning goes a long way.</p>
                    </div>
                    <button className="text-btn" onClick={() => go("Schedule")}>
                      View schedule
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  {upcoming.length ? (
                    <div className="preview-grid">
                      {upcoming.slice(0, 2).map((p) => (
                        <PostCard key={p.id} p={p} compact />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-schedule">
                      <div className="mini-calendar">
                        <div>YOUR NEXT CHAPTER</div>
                        <CalendarDays size={33} />
                        <span>Starts with a moment.</span>
                      </div>
                      <div>
                        <h3>Make room for your first post.</h3>
                        <p>
                          Upload a few favorites, add your goal, and let Perch
                          put a plan together.
                        </p>
                        <button
                          className="text-btn"
                          onClick={() => input.current.click()}
                        >
                          Add your first media
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </section>
                <aside className="control-card">
                  <div className="section-title">
                    <h2>At the controls</h2>
                    <SlidersHorizontal size={17} />
                  </div>
                  <div className="pilot-row">
                    <div className="pilot-icon">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <strong>Live posting</strong>
                      <span>
                        {s.settings.autopilot
                          ? "Scheduler is running"
                          : "Paused. You’re in control."}
                      </span>
                    </div>
                    <button
                      aria-label="Toggle live posting"
                      role="switch"
                      aria-checked={s.settings.autopilot}
                      className={"switch " + (s.settings.autopilot ? "on" : "")}
                      disabled={!!busy}
                      onClick={() =>
                        run("Updating", "/settings", "PATCH", {
                          autopilot: !s.settings.autopilot,
                        })
                      }
                    >
                      <span />
                    </button>
                  </div>
                  <div className="control-line">
                    <span>Posting pace</span>
                    <strong>{s.settings.dailyLimit} posts / day</strong>
                  </div>
                  <div className="control-line">
                    <span>New AI posts</span>
                    <strong>
                      {s.settings.autoApprove
                        ? "Auto-approved"
                        : "Review first"}
                    </strong>
                  </div>
                  <div className="control-line">
                    <span>Replies</span>
                    <strong>Always review</strong>
                  </div>
                  <div className="control-note">
                    <span className="dot green-dot" />
                    Your voice. Your final say.
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => go("Control center")}
                  >
                    Open control center
                    <ArrowRight size={14} />
                  </button>
                </aside>
              </div>
              <section className="bucket-strip">
                <div className="bucket-strip-icon">
                  <Images size={23} />
                </div>
                <div>
                  <h3>A home for your next great post.</h3>
                  <p>
                    {s.media.length
                      ? `${s.media.length} moments in your bucket. Keep the inspiration coming.`
                      : "Photos, videos, behind-the-scenes moments. Keep them all in one place."}
                  </p>
                </div>
                <button className="btn" onClick={() => go("Media bucket")}>
                  Open media bucket
                  <ArrowUpRight size={15} />
                </button>
              </section>
            </>
          )}
          {tab === "Media bucket" && (
            <>
              <div
                className={"upload-zone " + (drag ? "dragging" : "")}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDrag(true);
                }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDrag(false);
                  upload(e.dataTransfer.files);
                }}
              >
                <div className="upload-icon">
                  <Upload size={23} />
                </div>
                <h3>Drop your next great moment here</h3>
                <p>
                  Drag & drop, or{" "}
                  <button onClick={() => input.current.click()}>
                    browse files
                  </button>
                </p>
                <small>
                  JPG, PNG, WebP, GIF, MP4 & MOV · Up to 100 MB per file · 20 at
                  a time
                </small>
              </div>
              <div className="filter-bar">
                <div className="segmented">
                  {["All media", "Images", "Videos", "Unused"].map((f) => (
                    <button
                      key={f}
                      className={filter === f ? "selected" : ""}
                      onClick={() => setFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <span className="muted">
                  {s.media.length} files in your bucket
                </span>
              </div>
              {s.media.length ? (
                <div className="media-grid">
                  {s.media
                    .filter((m) =>
                      filter === "Images"
                        ? m.mime.startsWith("image/")
                        : filter === "Videos"
                          ? m.mime.startsWith("video/")
                          : filter === "Unused"
                            ? !used.has(m.id)
                            : true,
                    )
                    .map((m) => (
                      <article className="asset-card" key={m.id}>
                        <button
                          className="asset-preview"
                          onClick={() => setModal({ type: "media", item: m })}
                        >
                          <Media item={m} />
                          <Badge type={used.has(m.id) ? "green" : ""}>
                            {used.has(m.id) ? "In a plan" : "Available"}
                          </Badge>
                          {m.mime.startsWith("video/") && (
                            <span className="play-icon">
                              <Play size={23} />
                            </span>
                          )}
                        </button>
                        <div className="asset-info">
                          <strong title={m.name}>{m.name}</strong>
                          <span>
                            {(m.size / 1024 / 1024).toFixed(1)} MB ·{" "}
                            {m.mime.startsWith("video/") ? "Video" : "Image"}
                          </span>
                          <div>
                            <button
                              className="text-btn"
                              onClick={() =>
                                setModal({ type: "media", item: m })
                              }
                            >
                              Add context
                              <ArrowUpRight size={13} />
                            </button>
                            <button
                              className="icon-btn"
                              aria-label={"Create draft with " + m.name}
                              onClick={() => newDraft(m)}
                              disabled={!!busy}
                            >
                              <Plus size={17} />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                </div>
              ) : (
                <Empty icon={Images} title="A bucket full of possibilities">
                  Your uploads will appear here, ready for captions and a place
                  in the schedule.
                </Empty>
              )}
            </>
          )}
          {tab === "Schedule" && (
            <>
              <div className="filter-bar">
                <div className="segmented">
                  {["Upcoming", "Published", "Cancelled"].map((f) => (
                    <button
                      key={f}
                      className={postFilter === f ? "selected" : ""}
                      onClick={() => setPostFilter(f)}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <span className="muted">
                  <Clock size={14} />
                  Times shown in{" "}
                  {Intl.DateTimeFormat()
                    .resolvedOptions()
                    .timeZone.replaceAll("_", " ")}
                </span>
              </div>
              {(postFilter === "Upcoming"
                ? upcoming
                : postFilter === "Published"
                  ? published
                  : s.posts.filter((p) => p.status === "cancelled")
              ).length ? (
                <div className="schedule-grid">
                  {(postFilter === "Upcoming"
                    ? upcoming
                    : postFilter === "Published"
                      ? published
                      : s.posts.filter((p) => p.status === "cancelled")
                  ).map((p) => (
                    <PostCard key={p.id} p={p} />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={CalendarDays}
                  title={
                    postFilter === "Upcoming"
                      ? "Your calendar has a fresh start."
                      : `No ${postFilter.toLowerCase()} posts yet.`
                  }
                  action={
                    <button className="btn" onClick={() => go("Media bucket")}>
                      Open media bucket
                      <ArrowRight size={15} />
                    </button>
                  }
                >
                  Add media and generate a plan, or create your own draft from
                  any item in the bucket.
                </Empty>
              )}
            </>
          )}
          {tab === "Replies" && (
            <>
              <div className="info-banner">
                <MessageCircle size={18} />
                <span>
                  Perch helps you choose when a response adds value. You review
                  and send each reply.
                </span>
                <button
                  className="btn"
                  disabled={!!busy || !s.connections.x}
                  onClick={() =>
                    run(
                      "Syncing",
                      "/sync",
                      "POST",
                      {},
                      "Replies and metrics synced.",
                    )
                  }
                >
                  <RefreshCw size={14} />
                  Sync with X
                </button>
              </div>
              {s.replies.length ? (
                <div className="reply-list">
                  {s.replies.map((r) => (
                    <ReplyCard key={r.id} r={r} run={run} busy={busy} />
                  ))}
                </div>
              ) : (
                <Empty
                  icon={MessageCircle}
                  title="Good conversations start with a post."
                >
                  Connect X and publish through Perch. Sync to bring recent
                  direct replies into this inbox.
                </Empty>
              )}
            </>
          )}
          {tab === "History" && (
            <section className="history-list">
              {s.history.length ? (
                s.history.map((h) => (
                  <div className="history-event" key={h.id}>
                    <div className="history-icon">
                      <CheckCheck size={18} />
                    </div>
                    <div>
                      <strong>{h.title}</strong>
                      <p>{h.detail}</p>
                    </div>
                    <time>{date(h.at)}</time>
                  </div>
                ))
              ) : (
                <Empty
                  icon={History}
                  title="Your story is just getting started."
                >
                  Uploads, plans, approvals, and publishing results will all be
                  recorded here.
                </Empty>
              )}
            </section>
          )}
          {tab === "Control center" && (
            <Settings s={s} run={run} busy={busy} setModal={setModal} />
          )}
          <footer>
            <span>
              <Feather size={13} />
              Built for a more intentional presence.
            </span>
            <span>Made for your moments.</span>
          </footer>
        </main>
      </div>
      {busy && (
        <div className="working">
          <LoaderCircle size={16} className="spin" />
          {busy}
          {busy === "Generating plan" ? " · This may take a minute" : ""}
        </div>
      )}
      {toast && (
        <div role="status" className={"toast " + (toast.error ? "error" : "")}>
          <span>
            {toast.error ? <AlertCircle size={18} /> : <Check size={18} />}
          </span>
          {toast.text}
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className={"modal " + (modal.type === "media" ? "media-modal" : "")}
            role="dialog"
            aria-modal="true"
            aria-label={
              modal.type === "post"
                ? "Review post"
                : modal.type === "media"
                  ? "Media details"
                  : "Connect account"
            }
          >
            <button
              className="modal-close icon-btn"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X size={21} />
            </button>
            {modal.type === "post" ? (
              <PostEditor
                p={s.posts.find((p) => p.id === modal.item.id)}
                media={mediaFor(modal.item)}
                run={run}
                busy={busy}
                close={() => setModal(null)}
              />
            ) : modal.type === "media" ? (
              <MediaEditor
                m={modal.item}
                run={run}
                busy={busy}
                close={() => setModal(null)}
                newDraft={newDraft}
              />
            ) : (
              <Connection
                kind={modal.type}
                s={s}
                run={run}
                busy={busy}
                close={() => setModal(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Stat({ label, value, detail, icon: Icon }) {
  return (
    <div className="stat-card">
      <div>
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function Settings({ s, run, busy, setModal }) {
  const [form, setForm] = useState(s.settings);
  const change = (k, v) => setForm({ ...form, [k]: v });
  return (
    <div className="settings-grid">
      <div>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const { autopilot, autoApprove, ...fields } = form;
            run(
              "Saving direction",
              "/settings",
              "PATCH",
              fields,
              "Your direction has been saved.",
            );
          }}
        >
          <div className="panel-heading">
            <Target size={19} />
            <div>
              <h2>Your direction</h2>
              <p>Tell Perch what growth means to you.</p>
            </div>
          </div>
          <label>
            Account handle
            <input
              placeholder="@youraccount"
              value={form.handle}
              onChange={(e) => change("handle", e.target.value)}
            />
          </label>
          <label>
            Your goal
            <textarea
              rows={4}
              placeholder="e.g. Build a community around my landscape photography, share the stories behind my photos, and bring people to my print shop."
              value={form.goal}
              onChange={(e) => change("goal", e.target.value)}
              maxLength={3000}
            />
          </label>
          <label>
            Your voice
            <textarea
              rows={2}
              value={form.voice}
              onChange={(e) => change("voice", e.target.value)}
              placeholder="How should your captions sound?"
            />
          </label>
          <div className="form-divider" />
          <h3>A comfortable rhythm</h3>
          <div className="form-row">
            <label>
              Posts per day
              <select
                value={form.dailyLimit}
                onChange={(e) => change("dailyLimit", +e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "post" : "posts"} / day
                  </option>
                ))}
              </select>
            </label>
            <label>
              Timezone
              <input
                value={form.timezone}
                onChange={(e) => change("timezone", e.target.value)}
                placeholder="America/Los_Angeles"
              />
            </label>
          </div>
          <div className="form-row">
            <label>
              Posting starts
              <select
                value={form.startHour}
                onChange={(e) => change("startHour", +e.target.value)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option value={i} key={i}>
                    {String(i).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
            <label>
              Posting ends
              <select
                value={form.endHour}
                onChange={(e) => change("endHour", +e.target.value)}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option value={i + 1} key={i}>
                    {String(i + 1).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="field-help">
            The planner spaces posts at least 3 hours apart. Timing starts as an
            experiment; engagement results inform future content choices.
          </p>
          <button className="btn primary" disabled={!!busy} type="submit">
            Save direction
            <Check size={15} />
          </button>
        </form>
      </div>
      <div className="settings-side">
        <section className="panel">
          <div className="panel-heading">
            <SlidersHorizontal size={19} />
            <div>
              <h2>Automation</h2>
              <p>Set the pace. Keep the control.</p>
            </div>
          </div>
          <div className="setting-toggle">
            <div>
              <strong>Live posting</strong>
              <p>Publish approved posts when they’re due.</p>
            </div>
            <button
              className={"switch " + (s.settings.autopilot ? "on" : "")}
              role="switch"
              aria-label="Live posting"
              aria-checked={s.settings.autopilot}
              disabled={!!busy}
              onClick={() =>
                run("Updating", "/settings", "PATCH", {
                  autopilot: !s.settings.autopilot,
                })
              }
            >
              <span />
            </button>
          </div>
          <div className="setting-toggle">
            <div>
              <strong>Auto-approve AI posts</strong>
              <p>
                New AI plans can publish without review. Existing drafts stay as
                they are.
              </p>
            </div>
            <button
              className={"switch " + (s.settings.autoApprove ? "on" : "")}
              role="switch"
              aria-label="Auto-approve AI posts"
              aria-checked={s.settings.autoApprove}
              disabled={!!busy}
              onClick={() =>
                run("Updating", "/settings", "PATCH", {
                  autoApprove: !s.settings.autoApprove,
                })
              }
            >
              <span />
            </button>
          </div>
          <div className="setting-toggle">
            <div>
              <strong>Reply review</strong>
              <p>You approve and send every reply.</p>
            </div>
            <Badge type="green">Always on</Badge>
          </div>
          <p className="field-help">
            While live posting is on, Perch checks the queue every 15 seconds,
            syncs X hourly, and plans unused media when the queue runs low. Your
            laptop must stay awake.
          </p>
        </section>
        <section className="panel">
          <div className="panel-heading">
            <Link2 size={19} />
            <div>
              <h2>Connections</h2>
              <p>Give your workspace its wings.</p>
            </div>
          </div>
          {[
            ["x", "X account", "Publish media and read replies"],
            ["ai", "AI planner", "Image-aware captions & decisions"],
          ].map(([kind, name, desc]) => (
            <div className="connection" key={kind}>
              <div className={"connection-logo " + kind}>
                {kind === "x" ? "𝕏" : <Sparkles size={20} />}
              </div>
              <div>
                <strong>{name}</strong>
                <p>
                  {s.connections[kind]
                    ? kind === "x"
                      ? "@" + s.account.username
                      : "Connected · " + s.settings.model
                    : desc}
                </p>
              </div>
              <button
                className="btn small-btn"
                disabled={!!busy}
                onClick={() => setModal({ type: kind })}
              >
                {s.connections[kind] ? "Manage" : "Connect"}
              </button>
            </div>
          ))}
          <div className="sync-row">
            <small>
              {s.lastSync
                ? "Last sync: " + date(s.lastSync)
                : "No X activity synced yet"}
            </small>
            <button
              className="icon-btn"
              disabled={!!busy || !s.connections.x}
              aria-label="Sync X activity"
              onClick={() =>
                run("Syncing", "/sync", "POST", {}, "X activity synced.")
              }
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </section>
        <div className="soft-note">
          <Feather size={20} />
          <p>
            Engagement is a conversation, not a guarantee. Perch helps you learn
            what resonates while keeping your voice at the center.
          </p>
        </div>
      </div>
    </div>
  );
}
function PostEditor({ p, media, run, busy, close }) {
  const [caption, setCaption] = useState(p.caption),
    [when, setWhen] = useState(localInput(p.scheduledAt));
  const locked = ["published", "publishing", "cancelled", "uncertain"].includes(
    p.status,
  );
  async function save(status) {
    if (
      await run(
        "Saving post",
        "/posts/" + p.id,
        "PATCH",
        {
          caption,
          scheduledAt: new Date(when).toISOString(),
          ...(status ? { status } : {}),
        },
        status === "approved"
          ? "Post approved for scheduling."
          : "Draft saved.",
      )
    )
      close();
  }
  return (
    <>
      <div className="eyebrow">YOUR NEXT MOMENT</div>
      <h2>{locked ? "Post details" : "Make it sound like you."}</h2>
      <div className="editor-media">
        <Media item={media} controls />
      </div>
      <label>
        Caption
        <textarea
          rows={4}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={locked}
        />
      </label>
      <p className="field-help">
        {caption.length} characters · X’s weighted 280-character limit is
        checked on approval.
      </p>
      <label>
        Scheduled time · your device timezone
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          disabled={locked}
          required
        />
      </label>
      <div className="reason">
        <Sparkles size={16} />
        <span>{p.reason}</span>
      </div>
      {p.error && <p className="error-text">{p.error}</p>}
      {p.xId && (
        <a
          className="text-btn"
          href={"https://x.com/i/status/" + p.xId}
          target="_blank"
          rel="noreferrer"
        >
          View on X<ExternalLink size={14} />
        </a>
      )}
      {!locked && (
        <div className="modal-actions">
          <button
            className="icon-btn danger"
            aria-label="Cancel post"
            disabled={!!busy}
            onClick={async () => {
              if (
                await run(
                  "Cancelling",
                  "/posts/" + p.id,
                  "PATCH",
                  { status: "cancelled" },
                  "Post cancelled.",
                )
              )
                close();
            }}
          >
            <Trash2 size={18} />
          </button>
          <button
            className="btn"
            disabled={!!busy || !when}
            onClick={() => save()}
          >
            Save draft
          </button>
          <button
            className="btn primary"
            disabled={!!busy || !caption.trim() || !when}
            onClick={() => save("approved")}
          >
            <Check size={16} />
            Approve post
          </button>
        </div>
      )}
    </>
  );
}
function MediaEditor({ m, run, busy, close, newDraft }) {
  const [notes, setNotes] = useState(m.notes),
    [deleting, setDeleting] = useState(false);
  return (
    <>
      <div className="eyebrow">FROM YOUR BUCKET</div>
      <h2>{m.name}</h2>
      <div className="editor-media">
        <Media item={m} controls />
      </div>
      <label>
        The story behind this moment
        <textarea
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Where was this taken? What should people know? Add context, links, or anything to avoid."
        />
      </label>
      <p className="field-help">
        The AI can see photos. For videos, describe the content here so it can
        write an accurate caption.
      </p>
      <div className="modal-actions">
        <button
          className="icon-btn danger"
          aria-label="Delete media"
          onClick={() => setDeleting(!deleting)}
        >
          <Trash2 size={18} />
        </button>
        <button className="btn" disabled={!!busy} onClick={() => newDraft(m)}>
          Create draft
          <Plus size={15} />
        </button>
        <button
          className="btn primary"
          disabled={!!busy}
          onClick={async () => {
            if (
              await run(
                "Saving context",
                "/media/" + m.id,
                "PATCH",
                { notes },
                "Media context saved.",
              )
            )
              close();
          }}
        >
          Save context
          <Check size={15} />
        </button>
      </div>
      {deleting && (
        <div className="delete-confirm">
          <span>Remove this file from your bucket?</span>
          <button
            className="btn"
            disabled={!!busy}
            onClick={async () => {
              if (
                await run(
                  "Deleting media",
                  "/media/" + m.id,
                  "DELETE",
                  undefined,
                  "Media deleted.",
                )
              )
                close();
            }}
          >
            Delete file
          </button>
        </div>
      )}
    </>
  );
}
function Connection({ kind, s, run, busy, close }) {
  const [form, setForm] = useState({ model: s.settings.model });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          await run(
            "Connecting",
            "/connect/" + kind,
            "POST",
            form,
            "Connection verified and saved.",
          )
        )
          close();
      }}
    >
      <div className="eyebrow">LET’S GET CONNECTED</div>
      <h2>
        {kind === "x"
          ? "Your account, in good company."
          : "Meet your new planner."}
      </h2>
      <p className="modal-intro">
        {kind === "x"
          ? "Use your own X developer app’s user credentials with Read and Write access. Perch verifies the account before saving."
          : "Connect an OpenAI API key for image-aware captions and reply suggestions. Selected photos, notes, and your goal are sent to the AI when you generate a plan."}
      </p>
      <a
        className="text-btn"
        href={
          kind === "x"
            ? "https://console.x.com/"
            : "https://platform.openai.com/api-keys"
        }
        target="_blank"
        rel="noreferrer"
      >
        {kind === "x" ? "Open X developer console" : "Get an OpenAI API key"}
        <ExternalLink size={14} />
      </a>
      {(kind === "x"
        ? [
            ["appKey", "API key"],
            ["appSecret", "API key secret"],
            ["accessToken", "Access token"],
            ["accessSecret", "Access token secret"],
          ]
        : [["apiKey", "OpenAI API key"]]
      ).map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            type="password"
            autoComplete="off"
            required
            value={form[key] || ""}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </label>
      ))}
      {kind === "ai" && (
        <label>
          Model
          <input
            required
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />
        </label>
      )}
      <p className="field-help">
        Credentials are encrypted on this laptop and never returned to the
        browser. Access to X endpoints depends on your developer account
        permissions and credits.
      </p>
      <div className="modal-actions">
        {s.connections[kind] && (
          <button
            type="button"
            className="btn"
            disabled={!!busy}
            onClick={async () => {
              if (
                await run(
                  "Disconnecting",
                  "/connect/" + kind,
                  "DELETE",
                  undefined,
                  "Disconnected.",
                )
              )
                close();
            }}
          >
            Disconnect
          </button>
        )}
        <button className="btn primary" disabled={!!busy} type="submit">
          Verify & connect
          <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}
function ReplyCard({ r, run, busy }) {
  const [draft, setDraft] = useState(r.draft);
  useEffect(() => setDraft(r.draft), [r.draft]);
  return (
    <article className="panel reply-card">
      <div className="reply-heading">
        <strong>@{r.author}</strong>
        <Badge>{r.status}</Badge>
        <time>{date(r.at)}</time>
      </div>
      <p className="reply-text">{r.text}</p>
      {r.reason && (
        <div className="reason">
          <Sparkles size={15} />
          {r.reason}
        </div>
      )}
      {!["sent", "sending", "uncertain"].includes(r.status) && (
        <>
          <label>
            Your reply
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="Write a thoughtful reply, or ask the AI for a suggestion."
            />
          </label>
          <div className="reply-actions">
            <button
              className="btn"
              disabled={!!busy}
              onClick={() =>
                run("Drafting reply", "/replies/" + r.id + "/draft", "POST")
              }
            >
              Suggest reply
              <Sparkles size={14} />
            </button>
            <button
              className="text-btn"
              disabled={!!busy}
              onClick={() =>
                run("Skipping", "/replies/" + r.id, "PATCH", {
                  status: "skipped",
                })
              }
            >
              Skip
            </button>
            <button
              className="btn primary"
              disabled={!!busy || !draft.trim()}
              onClick={async () => {
                if (
                  await run("Saving reply", "/replies/" + r.id, "PATCH", {
                    draft,
                  })
                )
                  await run(
                    "Sending reply",
                    "/replies/" + r.id + "/send",
                    "POST",
                    {},
                    "Reply sent.",
                  );
              }}
            >
              Approve & send
              <Send size={14} />
            </button>
          </div>
        </>
      )}
      {r.status === "uncertain" && (
        <p className="error-text">
          X did not confirm the result. Check the conversation before replying
          again.
        </p>
      )}
    </article>
  );
}
createRoot(document.getElementById("root")).render(<App />);
