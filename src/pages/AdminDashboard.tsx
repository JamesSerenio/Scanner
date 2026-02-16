import React, { useEffect, useMemo, useState } from "react";
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from "@ionic/react";
import { useHistory } from "react-router-dom";
import { toDataURL } from "qrcode";
import { supabase } from "../utils/supabaseClient";

type PersonRow = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  image_url: string | null;     // ✅ public URL
  image_path: string | null;    // ✅ storage path (people/xxx.jpg)
  qr_value: string;
  created_at: string;
};

type LogRow = {
  id: string;
  created_at: string;
  person_id: string;
  scanned_by_role: string;
};

const AdminDashboard: React.FC = () => {
  const history = useHistory();

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("Male");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [msg, setMsg] = useState("");
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [logs, setLogs] = useState<Array<LogRow & { person?: PersonRow }>>([]);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const bucket = useMemo(() => "attendance", []);

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

  const getSafeExt = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    return allowed.includes(ext) ? ext : "jpg";
  };

  // ✅ UPLOAD to Storage bucket "attendance"
  const uploadImageToStorage = async (): Promise<
    { publicUrl: string; path: string } | null
  > => {
    if (!file) return null;

    const ext = getSafeExt(file.name);
    const path = `people/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || `image/${ext}`,
    });

    if (upErr) {
      setMsg(upErr.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    if (!publicUrl) {
      setMsg("Upload ok but failed to create public URL.");
      return null;
    }

    return { publicUrl, path };
  };

  // ✅ rollback helper
  const deleteStoragePath = async (path: string): Promise<void> => {
    if (!path) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.log("remove error:", error.message);
  };

  const addPerson = async (): Promise<void> => {
    setMsg("");

    if (!fullName.trim()) {
      setMsg("Full name required.");
      return;
    }

    const qrValue = `ATT-${crypto.randomUUID()}`;

    // ✅ upload first
    const uploaded = await uploadImageToStorage();

    const { data: sess } = await supabase.auth.getSession();
    const createdBy = sess.session?.user?.id ?? null;

    const { error } = await supabase.from("attendance_people").insert({
      full_name: fullName.trim(),
      age: age ? Number(age) : null,
      sex,
      address: address.trim() || null,
      contact: contact.trim() || null,
      qr_value: qrValue,
      created_by: createdBy,

      // ✅ store both
      image_url: uploaded?.publicUrl ?? null,
      image_path: uploaded?.path ?? null,
    });

    if (error) {
      // rollback uploaded file if DB insert fails
      if (uploaded?.path) await deleteStoragePath(uploaded.path);
      setMsg(error.message);
      return;
    }

    const url = await toDataURL(qrValue, { margin: 1, width: 420 });
    setQrDataUrl(url);

    setFullName("");
    setAge("");
    setAddress("");
    setContact("");
    setFile(null);

    setMsg("Person added + QR generated.");
    await loadPeople();
  };

  const logout = async (): Promise<void> => {
    await supabase.auth.signOut();
    history.replace("/home");
  };

  return (
    <IonPage className="admin-dashboard-page">
      <IonHeader>
        <IonToolbar>
          <IonTitle>Admin Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding admin-dashboard-content">
        <div className="admin-topbar">
          <IonButton expand="block" fill="outline" className="admin-logout-btn" onClick={logout}>
            Logout
          </IonButton>
        </div>

        <div className="admin-card">
          <h2 className="admin-section-title">Add Attendance Person</h2>

          <IonItem className="admin-form-item">
            <IonLabel position="stacked">Full Name</IonLabel>
            <IonInput value={fullName} onIonInput={(e) => setFullName(e.detail.value ?? "")} />
          </IonItem>

          <IonItem className="admin-form-item">
            <IonLabel position="stacked">Age</IonLabel>
            <IonInput
              value={age}
              onIonInput={(e) => setAge(e.detail.value ?? "")}
              type="number"
            />
          </IonItem>

          <IonItem className="admin-form-item">
            <IonLabel position="stacked">Sex</IonLabel>
            <IonSelect value={sex} onIonChange={(e) => setSex(String(e.detail.value))}>
              <IonSelectOption value="Male">Male</IonSelectOption>
              <IonSelectOption value="Female">Female</IonSelectOption>
              <IonSelectOption value="Other">Other</IonSelectOption>
            </IonSelect>
          </IonItem>

          <IonItem className="admin-form-item">
            <IonLabel position="stacked">Address</IonLabel>
            <IonInput value={address} onIonInput={(e) => setAddress(e.detail.value ?? "")} />
          </IonItem>

          <IonItem className="admin-form-item">
            <IonLabel position="stacked">Contact</IonLabel>
            <IonInput value={contact} onIonInput={(e) => setContact(e.detail.value ?? "")} />
          </IonItem>

          <div className="admin-upload">
            <label className="admin-upload-label">
              <span className="admin-upload-title">Image</span>
              <input
                className="admin-upload-input"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file ? (
              <IonText className="admin-upload-hint">
                <p>Selected: {file.name}</p>
              </IonText>
            ) : null}
          </div>

          {msg ? (
            <IonText className="admin-message">
              <p>{msg}</p>
            </IonText>
          ) : null}

          <IonButton expand="block" className="admin-save-btn" onClick={addPerson}>
            Save Person + Generate QR
          </IonButton>

          {qrDataUrl ? (
            <div className="qr-preview">
              <IonText>
                <p>
                  <b>Generated QR:</b>
                </p>
              </IonText>
              <img className="qr-image" src={qrDataUrl} alt="QR" />
            </div>
          ) : null}
        </div>

        <div className="divider" />

        <div className="admin-section">
          <h2 className="admin-section-title">Recent People</h2>

          <div className="people-grid">
            {people.map((p) => (
              <div key={p.id} className="person-card">
                <div className="person-top">
                  {p.image_url ? (
                    <img className="person-avatar" src={p.image_url} alt="person" />
                  ) : (
                    <div className="person-avatar placeholder">👤</div>
                  )}

                  <div className="person-meta">
                    <IonText>
                      <p className="person-name">{p.full_name}</p>
                      <p className="person-sub">
                        {p.sex ?? "N/A"} • {p.age ?? "N/A"}
                      </p>
                    </IonText>
                  </div>
                </div>

                <div className="person-qr">
                  <IonText>
                    <p className="person-qr-text">
                      <b>QR:</b> {p.qr_value}
                    </p>
                  </IonText>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="divider" />

        <div className="admin-section">
          <div className="logs-header">
            <h2 className="admin-section-title">Recent Attendance Logs</h2>
            <IonButton fill="outline" className="admin-refresh-btn" onClick={loadLogs}>
              Refresh
            </IonButton>
          </div>

          <div className="logs-list">
            {logs.map((l) => (
              <div key={l.id} className="log-card">
                <IonText>
                  <p className="log-name">
                    <b>{l.person?.full_name ?? "Unknown"}</b>
                  </p>
                  <p className="log-sub">
                    {new Date(l.created_at).toLocaleString()} • Role: {l.scanned_by_role}
                  </p>
                </IonText>
              </div>
            ))}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;
