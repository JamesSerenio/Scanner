import React, { useState } from "react";
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
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";

const AdminLogin: React.FC = () => {
  const history = useHistory();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  const login = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setErr(error.message);
      return;
    }
    history.replace("/admin/dashboard");
  };

  return (
    <IonPage className="admin-login-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Login</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding admin-login-content">
        <div className="admin-login-card">
          <h2 className="admin-login-title">Administrator Access</h2>

          <IonItem className="admin-login-item">
            <IonLabel position="stacked">Email</IonLabel>
            <IonInput
              value={email}
              type="email"
              placeholder="admin@email.com"
              onIonInput={(e) => setEmail(e.detail.value ?? "")}
            />
          </IonItem>

          <IonItem className="admin-login-item">
            <IonLabel position="stacked">Password</IonLabel>
            <IonInput
              value={password}
              type="password"
              placeholder="••••••••"
              onIonInput={(e) => setPassword(e.detail.value ?? "")}
            />
          </IonItem>

          {err ? (
            <IonText className="admin-login-error">
              <p>{err}</p>
            </IonText>
          ) : null}

          <IonButton expand="block" className="admin-login-btn" onClick={login}>
            Login
          </IonButton>

          <IonButton
            expand="block"
            fill="outline"
            className="admin-back-btn"
            onClick={() => history.push("/")}
          >
            Back
          </IonButton>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminLogin;
