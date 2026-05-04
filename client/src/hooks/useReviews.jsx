// frontend/src/hooks/useReviews.js
import { useState, useEffect, useCallback } from "react";
import { getAuth } from "firebase/auth";

const API = import.meta.env.REACT_APP_API_URL || "http://localhost:5000/api";

const getToken = async () => {
  const user = getAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
};

export function useReviews() {
  const [projects, setProjects]       = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [reviews, setReviews]         = useState([]);
  const [stats, setStats]             = useState(null);
  const [pagination, setPagination]   = useState(null);
  const [activeFilter, setActiveFilter] = useState("negative");
  const [loading, setLoading]         = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [error, setError]             = useState("");
  const [page, setPage]               = useState(1);

  // Fetch project list
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/reviews/projects`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setProjects(data.data.projects);
          if (data.data.projects.length > 0) setSelectedProject(data.data.projects[0]);
        }
      } catch (e) {
        setError("Failed to load projects.");
      }
    })();
  }, []);

  // Fetch reviews when project or filter changes
  const fetchReviews = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    setError("");
    try {
      const token = await getToken();
      const res = await fetch(
        `${API}/reviews/${selectedProject.projectId}?type=${activeFilter}&page=${page}&limit=15`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setReviews(data.data.reviews);
        setStats(data.data.stats);
        setPagination(data.data.pagination);
      }
    } catch (e) {
      setError("Failed to load reviews.");
    } finally {
      setLoading(false);
    }
  }, [selectedProject, activeFilter, page]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const setAction = (id, val) => setActionLoading((p) => ({ ...p, [id]: val }));

  const approve = async (reviewDbId) => {
    setAction(reviewDbId, "approving");
    try {
      const token = await getToken();
      const res = await fetch(
        `${API}/reviews/${selectedProject.projectId}/reviews/${reviewDbId}/approve`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setReviews((p) => p.map((r) => r._id === reviewDbId
          ? { ...r, replyStatus: "queued", allowReply: true } : r
        ));
      }
    } catch (e) {
      setError("Failed to approve.");
    } finally {
      setAction(reviewDbId, null);
    }
  };

  const deny = async (reviewDbId) => {
    setAction(reviewDbId, "denying");
    try {
      const token = await getToken();
      await fetch(
        `${API}/reviews/${selectedProject.projectId}/reviews/${reviewDbId}/deny`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } }
      );
      setReviews((p) => p.map((r) => r._id === reviewDbId
        ? { ...r, replyStatus: "skipped", allowReply: false } : r
      ));
    } catch (e) {
      setError("Failed to deny.");
    } finally {
      setAction(reviewDbId, null);
    }
  };

  const triggerFetch = async () => {
    if (!selectedProject) return;
    try {
      const token = await getToken();
      await fetch(`${API}/reviews/${selectedProject.projectId}/fetch`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTimeout(fetchReviews, 3000);
    } catch (e) {}
  };

  return {
    projects, selectedProject, setSelectedProject,
    reviews, stats, pagination, page, setPage,
    activeFilter, setActiveFilter,
    loading, actionLoading, error,
    approve, deny, triggerFetch, refetch: fetchReviews,
  };
}

// ── LIVE QUEUE HOOK ───────────────────────────────────────────────────────
export function useLiveQueue(projectId) {
  const [queued, setQueued]         = useState([]);
  const [recentlySent, setRecentlySent] = useState([]);
  const [failed, setFailed]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [now, setNow]               = useState(new Date());
  const [actionLoading, setActionLoading] = useState({});

  const fetchQueue = useCallback(async () => {
    if (!projectId) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/reviews/${projectId}/queue/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setQueued(data.data.queued);
        setRecentlySent(data.data.recentlySent);
        setFailed(data.data.failed);
        setNow(new Date(data.data.now));
      }
    } catch (e) {}
    finally { setLoading(false); }
  }, [projectId]);

  // Poll every 15 seconds
  useEffect(() => {
    fetchQueue();
    const id = setInterval(fetchQueue, 15000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  // Tick every second for countdown display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const cancelReply = async (queueId) => {
    setActionLoading((p) => ({ ...p, [queueId]: true }));
    try {
      const token = await getToken();
      await fetch(`${API}/reviews/${projectId}/queue/${queueId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setQueued((p) => p.filter((q) => q._id !== queueId));
    } catch (e) {}
    finally { setActionLoading((p) => ({ ...p, [queueId]: false })); }
  };

  const editReply = async (queueId, replyText) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/reviews/${projectId}/queue/${queueId}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ replyText }),
      });
      const data = await res.json();
      if (data.success) {
        setQueued((p) => p.map((q) => q._id === queueId ? { ...q, replyText } : q));
      }
      return data.success;
    } catch (e) { return false; }
  };

  return { queued, recentlySent, failed, loading, now, actionLoading, cancelReply, editReply, refetch: fetchQueue };
}