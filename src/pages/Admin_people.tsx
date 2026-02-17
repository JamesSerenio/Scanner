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
  age: number | null;
  sex: string | null;
  address: string | null;
  contact: string | null;
  image_url: string | null;
  image_path: string | null;
  qr_value: string;
  created_at: string;
};

const Admin_people: React.FC = () => {
  const history = useHistory();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState<PersonRow[]>([]);

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

  const loadPeople = async (): Promise<void> => {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("registered_people") // ✅ renamed table
      .select(
        "id, full_name, age, sex, address, contact, image_url, image_path, qr_value, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setPeople((data as PersonRow[]) ?? []);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        history.replace("/admin");
        return;
      }
      await loadPeople();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <IonPage className="rpl3-page">
      <IonHeader>
        <IonToolbar className="rpl3-toolbar">
          <IonTitle>Registered People</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="rpl3-content" scrollY={true}>
        <div className="rpl3-wrap">
          <div className="rpl3-card">
            <div className="rpl3-head">
              <div>
                <h2 className="rpl3-title">People Directory</h2>
                <p className="rpl3-subtitle">List of registered persons</p>
              </div>

              <IonButton className="rpl3-btn" onClick={loadPeople} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </IonButton>
            </div>

            {loading ? (
              <IonText className="rpl3-alert">
                <p className="rpl3-alertRow">
                  <IonSpinner name="dots" /> Loading people...
                </p>
              </IonText>
            ) : null}

            {msg ? (
              <IonText className="rpl3-alert rpl3-alert--error">
                <p>{msg}</p>
              </IonText>
            ) : null}

            <div className="rpl3-tableWrap">
              <table className="rpl3-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Photo</th>
                    <th>Full Name</th>
                    <th>Sex</th>
                    <th>Age</th>
                    <th>Contact</th>
                    <th>Address</th>
                    <th>QR</th>
                    <th>Registered At</th>
                  </tr>
                </thead>

                <tbody>
                  {people.length === 0 ? (
                    <tr>
                      <td className="rpl3-empty" colSpan={9}>
                        No registered people yet.
                      </td>
                    </tr>
                  ) : (
                    people.map((p, idx) => (
                      <tr key={p.id}>
                        <td>{idx + 1}</td>

                        <td>
                          {p.image_url ? (
                            <img className="rpl3-avatar" src={p.image_url} alt="person" />
                          ) : (
                            <div className="rpl3-avatar rpl3-avatar--ph">👤</div>
                          )}
                        </td>

                        <td className="rpl3-name">{p.full_name}</td>
                        <td>{p.sex ?? "—"}</td>
                        <td>{p.age ?? "—"}</td>
                        <td>{p.contact ?? "—"}</td>
                        <td className="rpl3-address">{p.address ?? "—"}</td>
                        <td className="rpl3-qr">{p.qr_value}</td>
                        <td>{fmt(p.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="rpl3-footNote">
              Showing up to <b>{Math.min(people.length, 200)}</b> rows.
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Admin_people;
