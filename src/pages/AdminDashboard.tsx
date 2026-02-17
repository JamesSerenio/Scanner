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

type AttendancePersonRow = {
  id: string;
  full_name: string;
  age: number | null;
  sex: string | null;
  image_url: string | null; // public URL
  image_path: string | null; // storage path
  qr_value: string;
  created_at: string;
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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  const bucket = useMemo(() => "attendance", []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) history.replace("/admin");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSafeExt = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    return allowed.includes(ext) ? ext : "jpg";
  };

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

  const deleteStoragePath = async (path: string): Promise<void> => {
    if (!path) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.log("remove error:", error.message);
  };

  const addPerson = async (): Promise<void> => {
    setMsg("");
    setQrDataUrl("");

    if (!fullName.trim()) {
      setMsg("Full name required.");
      return;
    }

    const qrValue = `ATT-${crypto.randomUUID()}`;
    const uploaded = await uploadImageToStorage();

    const { data: sess } = await supabase.auth.getSession();
    const createdBy = sess.session?.user?.id ?? null;

    const payload: Partial<AttendancePersonRow> & {
      address: string | null;
      contact: string | null;
      created_by: string | null;
    } = {
      full_name: fullName.trim(),
      age: age ? Number(age) : null,
      sex,
      address: address.trim() || null,
      contact: contact.trim() || null,
      qr_value: qrValue,
      created_by: createdBy,
      image_url: uploaded?.publicUrl ?? null,
      image_path: uploaded?.path ?? null,
    };

    const { error } = await supabase.from("attendance_people").insert(payload);

    if (error) {
      if (uploaded?.path) await deleteStoragePath(uploaded.path);
      setMsg(error.message);
      return;
    }

    const url = await toDataURL(qrValue, { margin: 1, width: 380 });
    setQrDataUrl(url);

    setFullName("");
    setAge("");
    setSex("Male");
    setAddress("");
    setContact("");
    setFile(null);

    setMsg("Person added + QR generated.");
  };

  return (
    <IonPage className="adb2-page">
      <IonHeader>
        <IonToolbar className="adb2-toolbar">
          <IonTitle>Admin Dashboard</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="adb2-content">
        <div className="adb2-wrap">
          <div className="adb2-card">
            <div className="adb2-head">
              <h2 className="adb2-title">Add Attendance Person</h2>

              <IonButton
                className="adb2-btn adb2-btn--small"
                onClick={() => history.push("/admin/attendance-record")}
              >
                Attendance Records
              </IonButton>
            </div>

            <IonItem className="adb2-item" lines="none">
              <IonLabel position="stacked">Full Name</IonLabel>
              <IonInput
                value={fullName}
                onIonInput={(e) => setFullName(e.detail.value ?? "")}
              />
            </IonItem>

            <IonItem className="adb2-item" lines="none">
              <IonLabel position="stacked">Age</IonLabel>
              <IonInput
                value={age}
                onIonInput={(e) => setAge(e.detail.value ?? "")}
                inputMode="numeric"
                type="number"
              />
            </IonItem>

            <IonItem className="adb2-item" lines="none">
              <IonLabel position="stacked">Sex</IonLabel>
              <IonSelect value={sex} onIonChange={(e) => setSex(String(e.detail.value))}>
                <IonSelectOption value="Male">Male</IonSelectOption>
                <IonSelectOption value="Female">Female</IonSelectOption>
                <IonSelectOption value="Other">Other</IonSelectOption>
              </IonSelect>
            </IonItem>

            <IonItem className="adb2-item" lines="none">
              <IonLabel position="stacked">Address</IonLabel>
              <IonInput
                value={address}
                onIonInput={(e) => setAddress(e.detail.value ?? "")}
              />
            </IonItem>

            <IonItem className="adb2-item" lines="none">
              <IonLabel position="stacked">Contact</IonLabel>
              <IonInput
                value={contact}
                onIonInput={(e) => setContact(e.detail.value ?? "")}
              />
            </IonItem>

            <div className="adb2-upload">
              <div className="adb2-uploadRow">
                <span className="adb2-uploadLabel">Image</span>
                <input
                  className="adb2-uploadInput"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {file ? (
                <IonText className="adb2-hint">
                  <p>Selected: {file.name}</p>
                </IonText>
              ) : null}
            </div>

            {msg ? (
              <IonText className="adb2-msg">
                <p>{msg}</p>
              </IonText>
            ) : null}

            <IonButton expand="block" className="adb2-btn" onClick={addPerson}>
              Save Person + Generate QR
            </IonButton>

            {qrDataUrl ? (
              <div className="adb2-qr">
                <IonText>
                  <p>
                    <b>Generated QR:</b>
                  </p>
                </IonText>
                <img className="adb2-qrImg" src={qrDataUrl} alt="QR" />
              </div>
            ) : null}
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default AdminDashboard;
