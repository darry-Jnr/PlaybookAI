export interface BookPage {
  illustration_prompt: string;
  text: string;
  alt_text: string | null;
}

export interface BookSpec {
  title: string;
  age_range: string;
  style_prompt: string;
  cover_prompt: string;
  back_cover_blurb: string;
  pages: BookPage[];
  total_pages: number;
}

export interface AssetInfo {
  url: string;
  media_type?: string;
  width?: number;
  height?: number;
  size_bytes?: number;
}

export type AssetsMap = Record<string, AssetInfo>;

export interface HistoryEntry {
  id: string;
  prompt: string;
  title: string;
  summary: string;
  plan_key: string;
  created_at: string;
  spec?: BookSpec;
  assets?: AssetsMap;
}

export type StreamEvent =
  | { kind: "stage.start"; stage: string }
  | { kind: "story.plan"; spec: BookSpec }
  | {
      kind: "step.started";
      stage: string;
      step_index: number;
      total_steps: number;
      provider: string;
      model: string;
    }
  | {
      kind: "step.completed";
      stage: string;
      step_index: number;
      elapsed_sec: number;
      assets?: AssetInfo[] | null;
    }
  | { kind: "step.failed"; stage: string; step_index: number; error: string }
  | {
      kind: "step.progress";
      stage: string;
      step_index: number;
      progress_pct: number;
      message?: string;
    }
  | {
      kind: "compose.complete";
      assets: AssetsMap;
      spec: BookSpec;
      run_id: string;
      title: string;
    }
  | { kind: "notice"; stage: string; message: string }
  | {
      kind: "error";
      stage: string;
      code?: string;
      retryable?: boolean;
      message: string;
      hint?: string;
    };
