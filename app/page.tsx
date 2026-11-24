 "use client";

import { useEffect, useMemo, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Heart, Gift, LockKeyhole, LogOut, Plus, Minus, Sparkles, RefreshCw } from "lucide-react";

type StateRow = { id: number; points: number; reward_name: string; redeemed_count: number; updated_at: string };
type EventRow = { id: number; action: string; delta: number; points_after: number; created_at: string };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function dateLabel(value: string) {
  return new Date(value).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
}

export default function Home() {
  const [state, setState] = useState<StateRow | null>(null);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rewardDraft, setRewardDraft] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAdmin = !!sessionEmail;
  const progress = Math.min(100, ((state?.points ?? 0) / 30) * 100);
  const remaining = Math.max(0, 30 - (state?.points ?? 0));

  async function refresh() {
    if (!supabase) { setLoading(false); return; }
    const [{ data: current, error: stateError }, { data: log, error: logError }] = await Promise.all([
      supabase.from("rewards_state").select("*").eq("id", 1).single(),
      supabase.from("point_events").select("*").order("created_at", { ascending: false }).limit(12)
    ]);
    if (stateError) setError("讀取資料失敗，請確認 Supabase SQL 已完成設定。");
    else if (current) { setState(current as StateRow); setRewardDraft((current as StateRow).reward_name); }
    if (!logError && log) setEvents(log as EventRow[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    refresh();
    supabase.auth.getSession().then(({ data }) => setSessionEmail(data.session?.user.email ?? null));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionEmail(session?.user.email ?? null);
    });
    const channel = supabase.channel("kuromi-rewards-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "rewards_state" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "point_events" }, refresh)
      .subscribe();
    return () => { authListener.subscription.unsubscribe(); supabase.removeChannel(channel); };
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setError(""); setMessage("");
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError("登入失敗：" + error.message);
    else { setMessage("管理員登入成功。"); setPassword(""); }
  }

  async function logout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setMessage("已登出管理員帳號。");
  }

  async function runRpc(name: "adjust_points" | "redeem_reward" | "update_reward", args: Record<string, unknown>) {
    if (!supabase || busy) return;
    setBusy(true); setError(""); setMessage("");
    const { error } = await supabase.rpc(name, args);
    if (error) setError(error.message.includes("admin") ? "此帳號沒有管理員權限。" : "操作失敗：" + error.message);
    else { setMessage(name === "redeem_reward" ? "兌換成功！點數已歸零。" : name === "update_reward" ? "獎勵名稱已更新。" : "點數已更新。"); await refresh(); }
    setBusy(false);
  }

  const history = useMemo(() => events, [events]);

  return (
    <main className="page-shell">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <section className="app-card">
        <header className="hero">
          <div className="topline"><span className="brand-mark"><Sparkles size={14}/> PURPLE EDITION</span><span className="tiny-heart">♡ KUROMI CLUB ♡</span></div>
          <div className="mascot" aria-label="紫色骷髏蝴蝶結裝飾">
            <div className="ears"><i/><i/></div><div className="hood"><div className="skull"><span/><b>♡</b></div></div>
            <div className="mascot-bow">✦</div>
          </div>
          <p className="eyebrow">COLLECT POINTS · UNLOCK HAPPINESS</p>
          <h1>KUROMI <span>REWARDS</span></h1>
          <p className="subtitle">集滿 30 點，解鎖你的專屬獎勵</p>
          <div className="sparkle s1">✦</div><div className="sparkle s2">✧</div><div className="sparkle s3">♡</div>
        </header>

        {!supabase && <div className="notice error">尚未設定 Supabase。請依照專案 README 完成環境變數與資料庫設定。</div>}
        {error && <div className="notice error">{error}</div>}
        {message && <div className="notice success">{message}</div>}

        <section className="content">
          <div className="score-panel">
            <div className="score-label">目前累積點數 <span>♡</span></div>
            {loading ? <div className="loading"><RefreshCw className="spin"/> 載入中…</div> : <>
              <div className="score"><strong>{state?.points ?? "—"}</strong><span>/ 30 <small>PTS</small></span></div>
              <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}/></div>
              <p className="progress-caption">{state?.points === 30 ? "🎉 集滿 30 點！可以兌換獎勵了！" : `再累積 ${remaining} 點，就能兌換獎勵`}</p>
            </>}
          </div>

          <div className="section-heading"><h2>我的集點卡</h2><span>30 POINTS</span></div>
          <div className="stamp-grid">
            {Array.from({ length: 30 }, (_, i) => {
              const filled = i < (state?.points ?? 0);
              return <div className={`stamp ${filled ? "filled" : ""}`} key={i}>{filled ? <Heart size={18} fill="currentColor"/> : <span>{String(i + 1).padStart(2, "0")}</span>}</div>;
            })}
          </div>

          <section className="reward-panel">
            <div className="reward-heading"><div><span className="gift-icon"><Gift size={18}/></span><h2>專屬兌換獎勵</h2></div><span className={`status ${state?.points === 30 ? "ready" : ""}`}>{state?.points === 30 ? "可兌換" : "未達標"}</span></div>
            <div className="reward-name">{state?.reward_name ?? "神秘專屬獎勵"}</div>
            <p>兌換門檻：30 點</p>
            <button className="primary-button" disabled={!isAdmin || state?.points !== 30 || busy} onClick={() => runRpc("redeem_reward", {})}><Gift size={17}/> {busy ? "處理中…" : "兌換獎勵"}</button>
            {!isAdmin && <div className="small-hint">兌換請由管理員操作</div>}
            <div className="redeemed-count">累計兌換 <b>{state?.redeemed_count ?? 0}</b> 次</div>
          </section>

          <section className="history-panel">
            <div className="section-heading"><h2>操作紀錄</h2><span>RECENT ACTIVITY</span></div>
            {history.length === 0 ? <p className="empty">目前還沒有操作紀錄</p> : history.map(item => <div className="history-row" key={item.id}><div><b>{item.action}</b><small>{dateLabel(item.created_at)}</small></div><span className={item.delta > 0 ? "plus" : item.delta < 0 ? "minus" : ""}>{item.delta > 0 ? `+${item.delta}` : item.delta < 0 ? item.delta : "兌換"}</span></div>)}
          </section>

          <section className="admin-section">
            <button className="admin-toggle" onClick={() => setAdminOpen(!adminOpen)}><span><LockKeyhole size={16}/> 管理員專區</span><span>{adminOpen ? "收起 −" : "登入／管理 +"}</span></button>
            {adminOpen && <div className="admin-box">
              {!isAdmin ? <form onSubmit={login} className="login-form">
                <p>只有管理員可以調整點數與獎勵設定。</p>
                <label>管理員 Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@example.com" required/></label>
                <label>密碼<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="輸入管理員密碼" required/></label>
                <button className="primary-button" type="submit">登入管理員</button>
              </form> : <div className="admin-controls">
                <div className="admin-user"><span>已登入：{sessionEmail}</span><button onClick={logout} className="logout"><LogOut size={14}/> 登出</button></div>
                <div className="adjust-buttons"><button disabled={busy || (state?.points ?? 0) >= 30} onClick={() => runRpc("adjust_points", { amount: 1 })}><Plus size={16}/> 增加 1 點</button><button disabled={busy || (state?.points ?? 0) <= 0} onClick={() => runRpc("adjust_points", { amount: -1 })}><Minus size={16}/> 扣除 1 點</button></div>
                <label>指定獎勵名稱<input value={rewardDraft} onChange={e => setRewardDraft(e.target.value)} maxLength={80}/></label>
                <button className="save-button" disabled={busy || !rewardDraft.trim()} onClick={() => runRpc("update_reward", { new_reward: rewardDraft.trim() })}>儲存獎勵設定</button>
              </div>}
            </div>}
          </section>
          <footer>KUROMI PURPLE REWARDS <span>♡</span><small>Made for your little moments of happiness</small></footer>
        </section>
      </section>
    </main>
  );
}
