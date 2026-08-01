"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, ListFilter, ArrowLeft, Trash2 } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { fetchHistory, deleteGeneration } from "@/lib/api";
import type { HistoryEntry } from "@/lib/types";

type Filter = "all" | "today" | "yesterday" | "week";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "Last 7 Days" },
];

function dateLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const hours = diff / 3600000;
  if (hours < 24) return "Today";
  if (hours < 48) return "Yesterday";
  if (hours < 168) return `${Math.floor(hours / 24)} days ago`;
  return new Date(iso).toLocaleDateString();
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Filter>("all");
  const [showFilter, setShowFilter] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    return entries.filter((e) => {
      if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      const ts = new Date(e.created_at).getTime();
      if (dateFilter === "today") return now - ts < 24 * 3600 * 1000;
      if (dateFilter === "yesterday") return now - ts >= 24 * 3600 * 1000 && now - ts < 48 * 3600 * 1000;
      if (dateFilter === "week") return now - ts < 7 * 24 * 3600 * 1000;
      return true;
    });
  }, [entries, searchQuery, dateFilter]);

  const handleRestore = (entry: HistoryEntry) => {
    window.location.href = `/create?id=${entry.id}`;
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteGeneration(id);
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch { /* ignore */ }
    setDeleting(null);
  };

  return (
    <div className="flex h-screen flex-col bg-[#FFFDF9]">
      <header className="shrink-0 border-b border-[#E6D8C7]/60 bg-[#FFF8F2]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-8">
          <Logo />
          <div />
        </div>
      </header>

      <div className="flex flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-12">
          <div className="mb-8 flex items-center gap-3">
            <a
              href="/create"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#999] transition hover:bg-[#FFF3DE] hover:text-[#E39B1F]"
            >
              <ArrowLeft className="h-4 w-4" />
            </a>
            <h1 className="font-display text-2xl font-semibold text-[#242424]">History</h1>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
              <input
                type="text"
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-[#E6D8C7] bg-white py-2.5 pl-10 pr-4 text-sm text-[#242424] placeholder:text-[#bbb] focus:border-[#E39B1F] focus:outline-none"
              />
            </div>
            <div className="relative shrink-0">
              <button
                onClick={() => setShowFilter((s) => !s)}
                className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                  dateFilter !== "all"
                    ? "border-[#E39B1F] bg-[#FFF3DE] text-[#E39B1F]"
                    : "border-[#E6D8C7] bg-white text-[#666] hover:border-[#E39B1F]/40"
                }`}
              >
                <ListFilter className="h-4 w-4" />
                {dateFilter !== "all" ? FILTER_OPTIONS.find((o) => o.value === dateFilter)?.label : "Filter"}
              </button>
              {showFilter && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                  <div className="absolute right-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl border border-[#E6D8C7] bg-white shadow-lg">
                    {FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => { setDateFilter(opt.value); setShowFilter(false); }}
                        className={`flex w-full items-center px-4 py-2.5 text-sm transition hover:bg-[#FFF3DE] ${
                          dateFilter === opt.value ? "font-semibold text-[#E39B1F]" : "text-[#242424]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-16 text-center">
              <p className="text-sm text-[#999]">Loading history...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-16 text-center">
              <p className="text-sm text-[#999]">
                {entries.length === 0 ? "No stories yet. Generate one to see it here." : "No history found matching your search."}
              </p>
            </div>
          ) : (
            <div>
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center justify-between border-b border-[#E6D8C7]/50 py-4"
                >
                  <button
                    onClick={() => handleRestore(entry)}
                    className="flex-1 text-left"
                  >
                    <h3 className="font-display text-base font-semibold text-[#242424] transition hover:italic hover:underline group-hover:text-[#E39B1F]">
                      {entry.title}
                    </h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-[#999]">
                      &ldquo;{entry.summary}&rdquo;
                    </p>
                  </button>
                  <div className="ml-4 flex shrink-0 items-center gap-3">
                    <span className="text-xs text-[#bbb]">{dateLabel(entry.created_at)}</span>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[#ccc] transition hover:bg-red-50 hover:text-red-400 disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
