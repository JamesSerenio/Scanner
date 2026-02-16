import React, { useEffect, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
  IonSpinner,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";


const AdminLogin: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Optional: if already logged in, go dashboard
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        history.replace("/admin/dashboard");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (): Promise<void> => {
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErr(error.message);
        return;
      }

      history.replace("/admin/dashboard");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IonPage className="admin-login-page-white">
      <IonHeader>
        <IonToolbar className="admin-toolbar-white">
          <IonTitle>Admin Login</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <div className="admin-center">
          <div className="admin-card-white">
            <h2 className="admin-title-white">Administrator Access</h2>

            <IonItem className="admin-item-white" lines="none">
              <IonLabel position="stacked">Email</IonLabel>
              <IonInput
                value={email}
                type="email"
                placeholder="admin@email.com"
                onIonInput={(e) => setEmail(e.detail.value ?? "")}
              />
            </IonItem>

            <IonItem className="admin-item-white" lines="none">
              <IonLabel position="stacked">Password</IonLabel>
              <IonInput
                value={password}
                type="password"
                placeholder="••••••••"
                onIonInput={(e) => setPassword(e.detail.value ?? "")}
              />
            </IonItem>

            {err ? (
              <IonText className="admin-error-white">
                <p>{err}</p>
              </IonText>
            ) : null}

            <IonButton
              expand="block"
              className="btn-green"
              onClick={login}
              disabled={loading}
            >
              {loading ? <IonSpinner name="crescent" /> : "Login"}
            </IonButton>

            <IonButton
              expand="block"
              fill="clear"
              className="btn-back"
              onClick={() => history.push("/")}
              disabled={loading}
            >
              Back
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLogin;
