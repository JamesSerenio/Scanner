import React, { useEffect, useMemo, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

type PersonRow = {
  id: string;
  full_name: string;
};

type LogRow = {
  id: string;
  time_in: string;
  time_out: string | null;
  person_id: string;
  scanned_by_role: string;
};

const AdminAttendanceRecord: React.FC = () => {
  const history = useHistory();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<Array<LogRow & { person?: PersonRow }>>([]);

  // ✅ Manila time display
  const dtf = useMemo(
    () =>
      new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    []
  );

  const fmt = (iso: string | null | undefined): string => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return dtf.format(d);
  };

  const loadLogs = async (): Promise<void> => {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id, time_in, time_out, person_id, scanned_by_role")
      .order("time_in", { ascending: false })
      .limit(200);

    if (error) {
      setLoading(false);
      setMsg(error.message);
      return;
    }

    const rows = (data as LogRow[]) ?? [];
    if (rows.length === 0) {
      setLoading(false);
      setLogs([]);
      return;
    }

    const personIds = Array.from(new Set(rows.map((r) => r.person_id)));

    const { data: peopleData, error: pErr } = await supabase
      .from("attendance_people")
      .select("id, full_name")
      .in("id", personIds);

    setLoading(false);

    if (pErr) {
      setMsg(pErr.message);
      return;
    }

    const map = new Map<string, PersonRow>();
    ((peopleData as PersonRow[]) ?? []).forEach((p) => map.set(p.id, p));

    setLogs(rows.map((r) => ({ ...r, person: map.get(r.person_id) })));
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        history.replace("/admin");
        return;
      }
      await loadLogs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage className="atr3-page">
      <IonHeader>
        <IonToolbar className="atr3-toolbar">
          <IonTitle>Attendance Records</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="atr3-content" scrollY={true}>
        <div className="atr3-wrap">
          <div className="atr3-card">
            <div className="atr3-head">
              <div>
                <h2 className="atr3-title">Time In / Time Out Logs</h2>
                <p className="atr3-subtitle">Latest attendance scan sessions</p>
              </div>

              <IonButton className="atr3-btn" onClick={loadLogs} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </IonButton>
            </div>

            {loading ? (
              <IonText className="atr3-alert">
                <p className="atr3-alertRow">
                  <IonSpinner name="dots" /> Loading logs...
                </p>
              </IonText>
            ) : null}

            {msg ? (
              <IonText className="atr3-alert atr3-alert--error">
                <p>{msg}</p>
              </IonText>
            ) : null}

            <div className="atr3-tableWrap">
              <table className="atr3-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Full Name</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Scanned By</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td className="atr3-empty" colSpan={6}>
                        No logs found yet.
                      </td>
                    </tr>
                  ) : (
                    logs.map((l, idx) => {
                      const status = l.time_out ? "Completed" : "In Session";
                      return (
                        <tr key={l.id}>
                          <td>{idx + 1}</td>
                          <td className="atr3-name">{l.person?.full_name ?? "Unknown"}</td>
                          <td>{fmt(l.time_in)}</td>
                          <td>{fmt(l.time_out)}</td>
                          <td>{l.scanned_by_role}</td>
                          <td>
                            <span
                              className={
                                status === "Completed"
                                  ? "atr3-pill atr3-pill--done"
                                  : "atr3-pill atr3-pill--open"
                              }
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="atr3-footNote">
              Showing up to <b>{Math.min(logs.length, 200)}</b> rows.
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminAttendanceRecord;
