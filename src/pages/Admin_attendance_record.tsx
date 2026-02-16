import React, { useEffect, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

type PersonRow = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  image_url: string | null;
  image_path: string | null;
  qr_value: string;
  created_at: string;
};

type LogRow = {
  id: string;
  created_at: string;
  person_id: string;
  scanned_by_role: string;
};

const AdminAttendanceRecord: React.FC = () => {
  const history = useHistory();

  const [msg, setMsg] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [logs, setLogs] = useState<Array<LogRow & { person?: PersonRow }>>([]);

  const loadPeople = async (): Promise<void> => {
    const { data, error } = await supabase
      .from("attendance_people")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(error.message);
      return;
    }
    setPeople((data as PersonRow[]) ?? []);
  };

  const loadLogs = async (): Promise<void> => {
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id, created_at, person_id, scanned_by_role")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      setMsg(error.message);
      return;
    }

    const rows = (data as LogRow[]) ?? [];
    if (rows.length === 0) {
      setLogs([]);
      return;
    }

    const personIds = Array.from(new Set(rows.map((r) => r.person_id)));

    const { data: peopleData, error: pErr } = await supabase
      .from("attendance_people")
      .select("*")
      .in("id", personIds);

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
      await loadPeople();
      await loadLogs();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage className="admin-white-page">
      <IonHeader>
        <IonToolbar className="admin-toolbar-white">
          <IonTitle>Attendance Records</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="admin-center-wide">
          <div className="admin-card-white">
            <div className="admin-header-row">
              <h2 className="admin-title-white">Recent People</h2>
              <div className="admin-header-actions">
                <IonButton className="btn-green small" onClick={loadPeople}>
                  Refresh
                </IonButton>
                <IonButton
                  className="btn-green small"
                  onClick={() => history.push("/admin/dashboard")}
                >
                  Back
                </IonButton>
              </div>
            </div>

            {msg ? (
              <IonText className="admin-message-white">
                <p>{msg}</p>
              </IonText>
            ) : null}

            <div className="people-grid-white">
              {people.map((p) => (
                <div key={p.id} className="person-card-white">
                  <div className="person-top-white">
                    {p.image_url ? (
                      <img className="person-avatar-white" src={p.image_url} alt="person" />
                    ) : (
                      <div className="person-avatar-white placeholder">👤</div>
                    )}

                    <div className="person-meta-white">
                      <IonText>
                        <p className="person-name-white">{p.full_name}</p>
                        <p className="person-sub-white">
                          {p.sex ?? "N/A"} • {p.age ?? "N/A"}
                        </p>
                      </IonText>
                    </div>
                  </div>

                  <div className="person-qr-white">
                    <IonText>
                      <p className="person-qr-text-white">
                        <b>QR:</b> {p.qr_value}
                      </p>
                    </IonText>
                  </div>
                </div>
              ))}
            </div>

            <div className="divider-white" />

            <div className="admin-header-row">
              <h2 className="admin-title-white">Recent Attendance Logs</h2>
              <IonButton className="btn-green small" onClick={loadLogs}>
                Refresh
              </IonButton>
            </div>

            <div className="logs-list-white">
              {logs.map((l) => (
                <div key={l.id} className="log-card-white">
                  <IonText>
                    <p className="log-name-white">
                      <b>{l.person?.full_name ?? "Unknown"}</b>
                    </p>
                    <p className="log-sub-white">
                      {new Date(l.created_at).toLocaleString()} • Role:{" "}
                      {l.scanned_by_role}
                    </p>
                  </IonText>
                </div>
              ))}
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminAttendanceRecord;
