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
  IonSpinner,
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

type UploadedImage = {
  publicUrl: string;
  path: string;
};

const AdminDashboard: React.FC = () => {
  const history = useHistory();

  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<string>("");
  const [sex, setSex] = useState<string>("Male");
  const [address, setAddress] = useState("");
  const [contact, setContact] = useState("");

  // ✅ selected local file (for name display only)
  const [file, setFile] = useState<File | null>(null);

  // ✅ uploaded storage info (source of preview + used on save)
  const [uploaded, setUploaded] = useState<UploadedImage | null>(null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const deleteStoragePath = async (path: string): Promise<void> => {
    if (!path) return;
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) console.log("remove error:", error.message);
  };

  // ✅ upload immediately when user picks an image
  const uploadNow = async (picked: File): Promise<UploadedImage | null> => {
    const ext = getSafeExt(picked.name);
    const path = `people/${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, picked, {
      cacheControl: "3600",
      upsert: false,
      contentType: picked.type || `image/${ext}`,
    });

    if (upErr) {
      setMsg(upErr.message);
      return null;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    const publicUrl = data.publicUrl;

    if (!publicUrl) {
      setMsg("Upload ok but failed to create public URL.");
      // clean orphan
      await deleteStoragePath(path);
      return null;
    }

    return { publicUrl, path };
  };

  const onPickFile = async (picked: File | null): Promise<void> => {
    setMsg("");
    setQrDataUrl("");

    if (!picked) return;

    // ✅ if may previous uploaded image, delete it first (replace behavior)
    if (uploaded?.path) {
      await deleteStoragePath(uploaded.path);
      setUploaded(null);
    }

    setFile(picked);
    setUploading(true);

    const up = await uploadNow(picked);

    setUploading(false);

    if (!up) {
      // failed upload
      setFile(null);
      setUploaded(null);
      return;
    }

    setUploaded(up);
  };

  const removeImage = async (): Promise<void> => {
    setMsg("");
    setQrDataUrl("");

    // ✅ delete from storage if uploaded
    if (uploaded?.path) {
      await deleteStoragePath(uploaded.path);
    }

    setUploaded(null);
    setFile(null);
  };

  const addPerson = async (): Promise<void> => {
    setMsg("");
    setQrDataUrl("");

    if (!fullName.trim()) {
      setMsg("Full name required.");
      return;
    }

    setSaving(true);

    const qrValue = `ATT-${crypto.randomUUID()}`;

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

      // ✅ use already-uploaded image (or null)
      image_url: uploaded?.publicUrl ?? null,
      image_path: uploaded?.path ?? null,
    };

    const { error } = await supabase.from("attendance_people").insert(payload);

    if (error) {
      // ✅ if save failed, also delete uploaded image (para walang orphan)
      if (uploaded?.path) await deleteStoragePath(uploaded.path);

      setSaving(false);
      setUploaded(null);
      setFile(null);

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

    // ✅ clear selection but KEEP uploaded? (usually after save you can clear it)
    setUploaded(null);
    setFile(null);

    setSaving(false);
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

            {/* ✅ Upload + Preview (from uploaded publicUrl) */}
            <div className="adb2-upload">
              <div className="adb2-uploadRow">
                <span className="adb2-uploadLabel">Image</span>

                <input
                  className="adb2-uploadInput"
                  type="file"
                  accept="image/*"
                  disabled={uploading || saving}
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {uploading ? (
                <IonText className="adb2-hint">
                  <p style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <IonSpinner name="dots" />
                    Uploading image...
                  </p>
                </IonText>
              ) : uploaded?.publicUrl ? (
                <div className="adb2-previewBox">
                  <img className="adb2-previewImg" src={uploaded.publicUrl} alt="Preview" />
                  <div className="adb2-previewActions">
                    <IonButton
                      className="adb2-btn adb2-btn--small"
                      fill="outline"
                      disabled={saving}
                      onClick={removeImage}
                    >
                      Remove
                    </IonButton>
                  </div>
                </div>
              ) : file ? (
                <IonText className="adb2-hint">
                  <p>Selected: {file.name}</p>
                </IonText>
              ) : (
                <IonText className="adb2-hint">
                  <p>No image selected.</p>
                </IonText>
              )}
            </div>

            {msg ? (
              <IonText className="adb2-msg">
                <p>{msg}</p>
              </IonText>
            ) : null}

            <IonButton
              expand="block"
              className="adb2-btn"
              disabled={uploading || saving}
              onClick={addPerson}
            >
              {saving ? "Saving..." : "Save Person + Generate QR"}
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
