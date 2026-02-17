import React, { useEffect, useState } from "react";
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

  const loadPeople = async (): Promise<void> => {
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase
      .from("attendance_people")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

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
    <IonPage className="admin-white-page">
      <IonHeader>
        <IonToolbar className="admin-toolbar-white">
          <IonTitle>People Directory</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="admin-center-wide">
          <div className="admin-card-white">
            <div className="admin-header-row">
              <h2 className="admin-title-white">Registered People</h2>

              <div className="admin-header-actions">
                <IonButton className="btn-green small" onClick={loadPeople} disabled={loading}>
                  {loading ? "Refreshing..." : "Refresh"}
                </IonButton>

                <IonButton
                  className="btn-green small"
                  onClick={() => history.push("/admin/dashboard")}
                >
                  Back
                </IonButton>
              </div>
            </div>

            {loading ? (
              <IonText className="admin-message-white">
                <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <IonSpinner name="dots" /> Loading people...
                </p>
              </IonText>
            ) : null}

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

            {!loading && people.length === 0 ? (
              <IonText className="admin-message-white">
                <p>No people found yet.</p>
              </IonText>
            ) : null}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Admin_people;
