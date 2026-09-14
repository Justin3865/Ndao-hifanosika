
"use client";

import { useEffect, useRef, useState } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Building2,
  Calendar,
  ShieldCheck,
  Edit3,
  Save,
  X,
  Camera,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Upload,
} from "lucide-react";

type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  location: string;
  birthDate: string;
  photo: string;
};

const DEFAULT_PROFILE: Profile = {
  firstName: "Justin",
  lastName: "ANDRIAMANANJARANIRINA",
  email: "justin@example.com",
  phone: "+261 34 00 000 00",
  role: "Administrateur",
  department: "DSI",
  location: "Fianarantsoa, Madagascar",
  birthDate: "03 Septembre 1997",
  photo: "",
};

export default function ProfilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [formData, setFormData] = useState<Profile>(DEFAULT_PROFILE);

  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">(
    "success"
  );

  // ==============================
  // CHARGER LE PROFIL
  // ==============================

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("ndao-profile");

      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);

        const loadedProfile = {
          ...DEFAULT_PROFILE,
          ...parsedProfile,
        };

        setProfile(loadedProfile);
        setFormData(loadedProfile);
      }
    } catch (error) {
      console.error("Erreur chargement profil :", error);
    }
  }, []);

  // ==============================
  // MESSAGE
  // ==============================

  const showMessage = (
    text: string,
    type: "success" | "error" = "success"
  ) => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage("");
    }, 3000);
  };

  // ==============================
  // MODIFICATION
  // ==============================

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==============================
  // ENREGISTRER PROFIL
  // ==============================

  const handleSave = () => {
    if (!formData.firstName.trim()) {
      showMessage("Le prénom est obligatoire.", "error");
      return;
    }

    if (!formData.lastName.trim()) {
      showMessage("Le nom est obligatoire.", "error");
      return;
    }

    if (!formData.email.trim()) {
      showMessage("L'adresse e-mail est obligatoire.", "error");
      return;
    }

    const updatedProfile = {
      ...formData,
    };

    setProfile(updatedProfile);
    setFormData(updatedProfile);

    localStorage.setItem(
      "ndao-profile",
      JSON.stringify(updatedProfile)
    );

    setEditing(false);

    showMessage("Profil enregistré avec succès.");
  };

  // ==============================
  // ANNULER
  // ==============================

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);

    showMessage("Modifications annulées.");
  };

  // ==============================
  // PHOTO
  // ==============================

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showMessage(
        "Veuillez sélectionner une image valide.",
        "error"
      );
      return;
    }

    // Limite 5 MB
    if (file.size > 5 * 1024 * 1024) {
      showMessage(
        "La photo ne doit pas dépasser 5 MB.",
        "error"
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const photo = reader.result as string;

      const updatedProfile = {
        ...profile,
        photo,
      };

      setProfile(updatedProfile);
      setFormData(updatedProfile);

      localStorage.setItem(
        "ndao-profile",
        JSON.stringify(updatedProfile)
      );

      showMessage("Photo de profil modifiée avec succès.");
    };

    reader.readAsDataURL(file);

    // Permet de sélectionner à nouveau le même fichier
    e.target.value = "";
  };

  // ==============================
  // SUPPRIMER PHOTO
  // ==============================

  const handleRemovePhoto = () => {
    const updatedProfile = {
      ...profile,
      photo: "",
    };

    setProfile(updatedProfile);
    setFormData(updatedProfile);

    localStorage.setItem(
      "ndao-profile",
      JSON.stringify(updatedProfile)
    );

    showMessage("Photo de profil supprimée.");
  };

  // ==============================
  // MOT DE PASSE
  // ==============================

  const handlePasswordChange = () => {
    if (!currentPassword) {
      showMessage(
        "Veuillez saisir votre mot de passe actuel.",
        "error"
      );
      return;
    }

    if (!newPassword) {
      showMessage(
        "Veuillez saisir le nouveau mot de passe.",
        "error"
      );
      return;
    }

    if (newPassword.length < 8) {
      showMessage(
        "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        "error"
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage(
        "Les nouveaux mots de passe ne correspondent pas.",
        "error"
      );
      return;
    }

    /*
      Pour le moment le mot de passe est uniquement
      simulé côté frontend.

      Dans la version finale avec Express/PostgreSQL,
      cette partie devra appeler l'API backend.
    */

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);

    showMessage("Mot de passe modifié avec succès.");
  };

  // ==============================
  // INITIALS
  // ==============================

  const getInitials = () => {
    const first = profile.firstName?.charAt(0) || "";
    const last = profile.lastName?.charAt(0) || "";

    return `${first}${last}`.toUpperCase();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "32px",
        color: "#111827",
      }}
    >
      <div
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        {/* =====================================
            MESSAGE
        ====================================== */}

        {message && (
          <div
            style={{
              position: "fixed",
              top: "24px",
              right: "24px",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 18px",
              borderRadius: "12px",
              background:
                messageType === "success"
                  ? "#dcfce7"
                  : "#fee2e2",
              color:
                messageType === "success"
                  ? "#166534"
                  : "#991b1b",
              border:
                messageType === "success"
                  ? "1px solid #bbf7d0"
                  : "1px solid #fecaca",
              boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {messageType === "success" ? (
              <CheckCircle2 size={19} />
            ) : (
              <X size={19} />
            )}

            {message}
          </div>
        )}

        {/* =====================================
            HEADER
        ====================================== */}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "28px",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "30px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Mon profil
            </h1>

            <p
              style={{
                marginTop: "8px",
                color: "#6b7280",
                fontSize: "15px",
              }}
            >
              Consultez et gérez vos informations personnelles.
            </p>
          </div>

          {!editing ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={primaryButton}
            >
              <Edit3 size={17} />
              Modifier le profil
            </button>
          ) : (
            <div
              style={{
                display: "flex",
                gap: "10px",
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                style={secondaryButton}
              >
                <X size={17} />
                Annuler
              </button>

              <button
                type="button"
                onClick={handleSave}
                style={successButton}
              >
                <Save size={17} />
                Enregistrer
              </button>
            </div>
          )}
        </div>

        {/* =====================================
            PROFILE CARD
        ====================================== */}

        <section
          style={{
            background: "#fff",
            borderRadius: "18px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
            marginBottom: "24px",
          }}
        >
          {/* COVER */}

          <div
            style={{
              height: "150px",
              background:
                "linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #4338ca 100%)",
            }}
          />

          {/* PROFILE CONTENT */}

          <div
            style={{
              padding: "0 32px 30px",
              position: "relative",
            }}
          >
            {/* AVATAR */}

            <div
              style={{
                position: "absolute",
                top: "-55px",
                left: "32px",
              }}
            >
              <div
                style={{
                  width: "110px",
                  height: "110px",
                  borderRadius: "50%",
                  background: "#fff",
                  border: "5px solid #fff",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.15)",
                  position: "relative",
                  overflow: "visible",
                }}
              >
                {profile.photo ? (
                  <img
                    src={profile.photo}
                    alt="Photo de profil"
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      background: "#dbeafe",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "28px",
                      fontWeight: 700,
                    }}
                  >
                    {getInitials()}
                  </div>
                )}

                {/* CAMERA */}

                <button
                  type="button"
                  onClick={handlePhotoClick}
                  title="Changer la photo"
                  style={{
                    position: "absolute",
                    right: "-5px",
                    bottom: "0",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: "3px solid #fff",
                    background: "#2563eb",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <Camera size={17} />
                </button>
              </div>

              {/* HIDDEN FILE INPUT */}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={handlePhotoChange}
                style={{
                  display: "none",
                }}
              />
            </div>

            {/* PHOTO ACTIONS */}

            <div
              style={{
                paddingTop: "70px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "24px",
                      margin: 0,
                      fontWeight: 700,
                    }}
                  >
                    {profile.firstName} {profile.lastName}
                  </h2>

                  <p
                    style={{
                      color: "#6b7280",
                      marginTop: "6px",
                      marginBottom: 0,
                    }}
                  >
                    {profile.role}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      marginTop: "14px",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={handlePhotoClick}
                      style={smallButton}
                    >
                      <Upload size={15} />
                      Changer la photo
                    </button>

                    {profile.photo && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        style={dangerButton}
                      >
                        <Trash2 size={15} />
                        Supprimer
                      </button>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "7px",
                    padding: "8px 13px",
                    borderRadius: "20px",
                    background: "#dcfce7",
                    color: "#15803d",
                    fontSize: "13px",
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={16} />
                  Compte actif
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================
            GRID
        ====================================== */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {/* =====================================
              INFORMATIONS PERSONNELLES
          ====================================== */}

          <section style={cardStyle}>
            <SectionHeader
              icon={<User size={21} />}
              title="Informations personnelles"
              subtitle="Vos informations de base"
              iconBackground="#eff6ff"
              iconColor="#2563eb"
            />

            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              <InputField
                label="Prénom"
                name="firstName"
                value={formData.firstName}
                editing={editing}
                onChange={handleChange}
              />

              <InputField
                label="Nom"
                name="lastName"
                value={formData.lastName}
                editing={editing}
                onChange={handleChange}
              />

              <InputField
                label="Date de naissance"
                name="birthDate"
                value={formData.birthDate}
                editing={editing}
                onChange={handleChange}
                icon={<Calendar size={17} />}
              />
            </div>
          </section>

          {/* =====================================
              CONTACT
          ====================================== */}

          <section style={cardStyle}>
            <SectionHeader
              icon={<Mail size={21} />}
              title="Coordonnées"
              subtitle="Vos informations de contact"
              iconBackground="#f0fdf4"
              iconColor="#16a34a"
            />

            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              <InputField
                label="Adresse e-mail"
                name="email"
                value={formData.email}
                editing={editing}
                onChange={handleChange}
                icon={<Mail size={17} />}
              />

              <InputField
                label="Téléphone"
                name="phone"
                value={formData.phone}
                editing={editing}
                onChange={handleChange}
                icon={<Phone size={17} />}
              />

              <InputField
                label="Localisation"
                name="location"
                value={formData.location}
                editing={editing}
                onChange={handleChange}
                icon={<MapPin size={17} />}
              />
            </div>
          </section>

          {/* =====================================
              PROFESSIONNEL
          ====================================== */}

          <section style={cardStyle}>
            <SectionHeader
              icon={<Briefcase size={21} />}
              title="Informations professionnelles"
              subtitle="Votre fonction dans l'organisation"
              iconBackground="#fff7ed"
              iconColor="#ea580c"
            />

            <div
              style={{
                display: "grid",
              }}
            >
              <InfoRow
                icon={<ShieldCheck size={18} />}
                label="Rôle"
                value={profile.role}
              />

              <InfoRow
                icon={<Building2 size={18} />}
                label="Département"
                value={profile.department}
              />

              <InfoRow
                icon={<Briefcase size={18} />}
                label="Organisation"
                value="Ndao Hifanosika"
              />
            </div>
          </section>

          {/* =====================================
              SECURITE
          ====================================== */}

          <section style={cardStyle}>
            <SectionHeader
              icon={<ShieldCheck size={21} />}
              title="Sécurité"
              subtitle="Gestion de votre compte"
              iconBackground="#fef2f2"
              iconColor="#dc2626"
            />

            {!showPasswordForm ? (
              <>
                <button
                  type="button"
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#374151",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "9px",
                  }}
                >
                  <Lock size={17} />
                  Modifier le mot de passe
                </button>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#9ca3af",
                    marginTop: "12px",
                    lineHeight: 1.5,
                  }}
                >
                  Protégez votre compte avec un mot de passe
                  suffisamment long et difficile à deviner.
                </p>
              </>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: "16px",
                }}
              >
                <PasswordField
                  label="Mot de passe actuel"
                  value={currentPassword}
                  show={showCurrentPassword}
                  onChange={setCurrentPassword}
                  onToggle={() =>
                    setShowCurrentPassword(
                      !showCurrentPassword
                    )
                  }
                />

                <PasswordField
                  label="Nouveau mot de passe"
                  value={newPassword}
                  show={showNewPassword}
                  onChange={setNewPassword}
                  onToggle={() =>
                    setShowNewPassword(!showNewPassword)
                  }
                />

                <PasswordField
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  show={showConfirmPassword}
                  onChange={setConfirmPassword}
                  onToggle={() =>
                    setShowConfirmPassword(
                      !showConfirmPassword
                    )
                  }
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    marginTop: "5px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                    style={{
                      ...secondaryButton,
                      flex: 1,
                    }}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    onClick={handlePasswordChange}
                    style={{
                      ...successButton,
                      flex: 1,
                    }}
                  >
                    <Save size={16} />
                    Enregistrer
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

/* =====================================================
   SECTION HEADER
===================================================== */

function SectionHeader({
  icon,
  title,
  subtitle,
  iconBackground,
  iconColor,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBackground: string;
  iconColor: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "24px",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          background: iconBackground,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "18px",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "4px 0 0",
            color: "#9ca3af",
            fontSize: "13px",
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* =====================================================
   INPUT FIELD
===================================================== */

function InputField({
  label,
  name,
  value,
  editing,
  onChange,
  icon,
}: {
  label: string;
  name: string;
  value: string;
  editing: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#4b5563",
          marginBottom: "7px",
        }}
      >
        {label}
      </label>

      {editing ? (
        <div
          style={{
            position: "relative",
          }}
        >
          {icon && (
            <span
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#9ca3af",
                display: "flex",
              }}
            >
              {icon}
            </span>
          )}

          <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: icon
                ? "11px 12px 11px 40px"
                : "11px 12px",
              border: "1px solid #d1d5db",
              borderRadius: "9px",
              outline: "none",
              fontSize: "14px",
              color: "#111827",
              background: "#fff",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "9px",
            minHeight: "42px",
            color: "#111827",
            fontSize: "14px",
          }}
        >
          {icon && (
            <span
              style={{
                color: "#6b7280",
                display: "flex",
              }}
            >
              {icon}
            </span>
          )}

          <span>{value || "Non renseigné"}</span>
        </div>
      )}
    </div>
  );
}

/* =====================================================
   PASSWORD FIELD
===================================================== */

function PasswordField({
  label,
  value,
  show,
  onChange,
  onToggle,
}: {
  label: string;
  value: string;
  show: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "13px",
          fontWeight: 600,
          color: "#4b5563",
          marginBottom: "7px",
        }}
      >
        {label}
      </label>

      <div
        style={{
          position: "relative",
        }}
      >
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "11px 45px 11px 12px",
            border: "1px solid #d1d5db",
            borderRadius: "9px",
            outline: "none",
            fontSize: "14px",
          }}
        />

        <button
          type="button"
          onClick={onToggle}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

/* =====================================================
   INFO ROW
===================================================== */

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "13px",
        padding: "13px 0",
        borderBottom: "1px solid #f3f4f6",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          display: "flex",
        }}
      >
        {icon}
      </div>

      <div>
        <div
          style={{
            fontSize: "12px",
            color: "#9ca3af",
            marginBottom: "3px",
          }}
        >
          {label}
        </div>

        <div
          style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   STYLES
===================================================== */

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "26px",
};

const primaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "11px 18px",
  border: "none",
  borderRadius: "10px",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "11px 17px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  background: "#fff",
  color: "#374151",
  fontWeight: 600,
  cursor: "pointer",
};

const successButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  padding: "11px 17px",
  border: "none",
  borderRadius: "10px",
  background: "#16a34a",
  color: "#fff",
  fontWeight: 600,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "8px 12px",
  border: "1px solid #dbeafe",
  borderRadius: "8px",
  background: "#eff6ff",
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

const dangerButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "7px",
  padding: "8px 12px",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  background: "#fef2f2",
  color: "#dc2626",
  fontSize: "12px",
  fontWeight: 600,
  cursor: "pointer",
};

