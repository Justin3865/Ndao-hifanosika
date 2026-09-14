"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Smartphone,
  Monitor,
  Globe,
  LogOut,
  Bell,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Settings,
} from "lucide-react";

export default function SecurityPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactor, setTwoFactor] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);

    setTimeout(() => {
      setSaving(false);
    }, 1000);
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
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "30px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "8px",
              }}
            >
              <ShieldCheck size={32} />
              <h1
                style={{
                  margin: 0,
                  fontSize: "30px",
                  fontWeight: 800,
                }}
              >
                Sécurité
              </h1>
            </div>

            <p
              style={{
                margin: 0,
                color: "#6b7280",
                fontSize: "15px",
              }}
            >
              Gérez la sécurité de votre compte et surveillez les accès.
            </p>
          </div>

          <Link
            href="/settings"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "11px 16px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "10px",
              color: "#374151",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            <Settings size={17} />
            Paramètres
          </Link>
        </div>

        {/* SECURITY STATUS */}
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div
                style={{
                  width: "54px",
                  height: "54px",
                  borderRadius: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#ecfdf5",
                }}
              >
                <ShieldCheck size={29} />
              </div>

              <div>
                <h2
                  style={{
                    margin: "0 0 5px",
                    fontSize: "19px",
                  }}
                >
                  État de sécurité
                </h2>

                <p
                  style={{
                    margin: 0,
                    color: "#6b7280",
                    fontSize: "14px",
                  }}
                >
                  Votre compte est correctement protégé.
                </p>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 14px",
                borderRadius: "999px",
                background: "#ecfdf5",
                fontSize: "13px",
                fontWeight: 700,
              }}
            >
              <CheckCircle2 size={16} />
              Sécurité satisfaisante
            </div>
          </div>
        </section>

        {/* GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {/* PASSWORD */}
          <SecurityCard
            icon={<Lock size={22} />}
            title="Mot de passe"
            description="Protégez votre compte avec un mot de passe robuste."
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  defaultValue="NdaoHifanosika2026"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "12px 42px 12px 13px",
                    border: "1px solid #d1d5db",
                    borderRadius: "9px",
                    outline: "none",
                    fontSize: "14px",
                  }}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: 0,
                    background: "transparent",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                color: "#059669",
                fontSize: "13px",
                marginBottom: "16px",
              }}
            >
              <CheckCircle2 size={16} />
              Mot de passe suffisamment robuste
            </div>

            <button
              type="button"
              onClick={handleSave}
              style={primaryButton}
            >
              <KeyRound size={17} />
              {saving ? "Enregistrement..." : "Modifier le mot de passe"}
            </button>
          </SecurityCard>

          {/* 2FA */}
          <SecurityCard
            icon={<Smartphone size={22} />}
            title="Authentification à deux facteurs"
            description="Ajoutez une couche de protection supplémentaire."
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
                borderRadius: "10px",
                background: "#f9fafb",
                marginBottom: "16px",
              }}
            >
              <div>
                <strong
                  style={{
                    display: "block",
                    marginBottom: "4px",
                    fontSize: "14px",
                  }}
                >
                  2FA
                </strong>

                <span
                  style={{
                    color: "#6b7280",
                    fontSize: "13px",
                  }}
                >
                  {twoFactor ? "Activée" : "Désactivée"}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setTwoFactor(!twoFactor)}
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "999px",
                  border: 0,
                  cursor: "pointer",
                  background: twoFactor ? "#111827" : "#d1d5db",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: twoFactor ? "25px" : "3px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    transition: "all 0.2s",
                  }}
                />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                gap: "9px",
                padding: "12px",
                background: twoFactor ? "#ecfdf5" : "#fff7ed",
                borderRadius: "9px",
                marginBottom: "16px",
              }}
            >
              {twoFactor ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}

              <span
                style={{
                  fontSize: "13px",
                  lineHeight: 1.5,
                }}
              >
                {twoFactor
                  ? "La double authentification protège votre compte."
                  : "Activez la 2FA pour renforcer la sécurité du compte."}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setTwoFactor(!twoFactor)}
              style={secondaryButton}
            >
              <Smartphone size={17} />
              {twoFactor ? "Désactiver la 2FA" : "Configurer la 2FA"}
            </button>
          </SecurityCard>

          {/* LOGIN ALERTS */}
          <SecurityCard
            icon={<BellRing size={22} />}
            title="Alertes de connexion"
            description="Recevez une notification lors d'une nouvelle connexion."
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "15px",
                background: "#f9fafb",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "11px",
                }}
              >
                <Bell size={19} />

                <div>
                  <strong
                    style={{
                      display: "block",
                      fontSize: "14px",
                      marginBottom: "3px",
                    }}
                  >
                    Notifications
                  </strong>

                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                    }}
                  >
                    Nouvelles connexions
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setLoginAlerts(!loginAlerts)}
                style={{
                  width: "48px",
                  height: "26px",
                  borderRadius: "999px",
                  border: 0,
                  cursor: "pointer",
                  background: loginAlerts ? "#111827" : "#d1d5db",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: loginAlerts ? "25px" : "3px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "#ffffff",
                  }}
                />
              </button>
            </div>
          </SecurityCard>

          {/* ROLES */}
          <SecurityCard
            icon={<ShieldAlert size={22} />}
            title="Rôles et permissions"
            description="Contrôlez les droits d'accès des utilisateurs."
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                marginBottom: "16px",
              }}
            >
              {[
                ["Administrateur", "Accès complet"],
                ["DSI", "Administration technique"],
                ["DAF", "Finance et rapports"],
                ["RH", "Gestion des ressources humaines"],
              ].map(([role, permission]) => (
                <div
                  key={role}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 13px",
                    border: "1px solid #e5e7eb",
                    borderRadius: "9px",
                  }}
                >
                  <strong style={{ fontSize: "13px" }}>{role}</strong>

                  <span
                    style={{
                      color: "#6b7280",
                      fontSize: "12px",
                    }}
                  >
                    {permission}
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/security/permissions"
              style={secondaryButton}
            >
              Gérer les permissions
              <ChevronRight size={17} />
            </Link>
          </SecurityCard>
        </div>

        {/* ACTIVE SESSIONS */}
        <section
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "15px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  margin: "0 0 5px",
                  fontSize: "19px",
                }}
              >
                Sessions actives
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Consultez les appareils actuellement connectés.
              </p>
            </div>

            <button type="button" style={dangerButton}>
              <LogOut size={17} />
              Déconnecter toutes les sessions
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            <Session
              icon={<Monitor size={21} />}
              device="Windows — Chrome"
              location="Antananarivo, Madagascar"
              time="Session actuelle"
              current
            />

            <Session
              icon={<Smartphone size={21} />}
              device="Android"
              location="Antananarivo, Madagascar"
              time="Il y a 2 heures"
            />

            <Session
              icon={<Globe size={21} />}
              device="Navigateur Web"
              location="Madagascar"
              time="Il y a 1 jour"
            />
          </div>
        </section>

        {/* SECURITY LOG */}
        <section
          style={{
            marginTop: "24px",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <Clock3 size={21} />

            <div>
              <h2
                style={{
                  margin: "0 0 4px",
                  fontSize: "19px",
                }}
              >
                Journal de sécurité
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#6b7280",
                  fontSize: "13px",
                }}
              >
                Historique des principales activités de sécurité.
              </p>
            </div>
          </div>

          <SecurityEvent
            title="Connexion réussie"
            description="Nouvelle connexion depuis Windows — Chrome"
            time="Aujourd'hui, 21:40"
            icon={<CheckCircle2 size={18} />}
          />

          <SecurityEvent
            title="Mot de passe vérifié"
            description="Authentification réussie"
            time="Aujourd'hui, 21:40"
            icon={<Lock size={18} />}
          />

          <SecurityEvent
            title="Session active"
            description="Session Windows actuellement utilisée"
            time="Aujourd'hui, 21:40"
            icon={<Monitor size={18} />}
          />
        </section>

        {/* FOOTER */}
        <div
          style={{
            marginTop: "25px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#9ca3af",
            fontSize: "12px",
          }}
        >
          <RefreshCw size={14} />
          Dernière vérification de sécurité : aujourd'hui
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
============================================================ */

function SecurityCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "22px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: "12px",
          alignItems: "flex-start",
          marginBottom: "18px",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            minWidth: "42px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f3f4f6",
          }}
        >
          {icon}
        </div>

        <div>
          <h2
            style={{
              margin: "0 0 5px",
              fontSize: "17px",
            }}
          >
            {title}
          </h2>

          <p
            style={{
              margin: 0,
              color: "#6b7280",
              fontSize: "13px",
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

function Session({
  icon,
  device,
  location,
  time,
  current = false,
}: {
  icon: React.ReactNode;
  device: string;
  location: string;
  time: string;
  current?: boolean;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "15px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <strong
          style={{
            display: "block",
            fontSize: "14px",
            marginBottom: "4px",
          }}
        >
          {device}
        </strong>

        <div
          style={{
            fontSize: "12px",
            color: "#6b7280",
            marginBottom: "3px",
          }}
        >
          {location}
        </div>

        <div
          style={{
            fontSize: "11px",
            color: current ? "#059669" : "#9ca3af",
          }}
        >
          {time}
        </div>
      </div>
    </div>
  );
}

function SecurityEvent({
  title,
  description,
  time,
  icon,
}: {
  title: string;
  description: string;
  time: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "13px",
        padding: "14px 0",
        borderBottom: "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          minWidth: "36px",
          borderRadius: "9px",
          background: "#f3f4f6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>

      <div style={{ flex: 1 }}>
        <strong
          style={{
            display: "block",
            fontSize: "14px",
            marginBottom: "3px",
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: "block",
            color: "#6b7280",
            fontSize: "12px",
          }}
        >
          {description}
        </span>
      </div>

      <span
        style={{
          color: "#9ca3af",
          fontSize: "11px",
          whiteSpace: "nowrap",
        }}
      >
        {time}
      </span>
    </div>
  );
}

/* ============================================================
   STYLES
============================================================ */

const primaryButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  border: 0,
  borderRadius: "9px",
  padding: "11px 14px",
  background: "#111827",
  color: "#ffffff",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  border: "1px solid #d1d5db",
  borderRadius: "9px",
  padding: "10px 14px",
  background: "#ffffff",
  color: "#374151",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
  textDecoration: "none",
};

const dangerButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  border: "1px solid #fecaca",
  borderRadius: "9px",
  padding: "10px 14px",
  background: "#fffafa",
  color: "#b91c1c",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "13px",
};