"use client";

import { useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Check,
  X,
  Search,
  Save,
  Users,
  FolderKanban,
  ClipboardCheck,
  BarChart3,
  Bell,
  Brain,
  Settings,
  UserCog,
  Eye,
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";

type Permission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

type Role = {
  id: number;
  name: string;
  description: string;
  users: number;
  protected: boolean;
  permissions: Record<string, Permission>;
};

const modules = [
  {
    id: "users",
    name: "Utilisateurs",
    description: "Gestion des comptes utilisateurs et des accès",
    icon: Users,
  },
  {
    id: "projects",
    name: "Projets & Programmes",
    description: "Gestion des projets, programmes et activités",
    icon: FolderKanban,
  },
  {
    id: "evaluations",
    name: "Suivi & Évaluation",
    description: "Évaluations des équipes et des activités",
    icon: ClipboardCheck,
  },
  {
    id: "beneficiaries",
    name: "Bénéficiaires",
    description: "Suivi des bénéficiaires",
    icon: Users,
  },
  {
    id: "reports",
    name: "Rapports & Tableaux de bord",
    description: "Reporting, indicateurs et statistiques",
    icon: BarChart3,
  },
  {
    id: "notifications",
    name: "Notifications",
    description: "Notifications et rappels",
    icon: Bell,
  },
  {
    id: "ai",
    name: "Intelligence Artificielle",
    description: "Analyse IA et prédictions",
    icon: Brain,
  },
  {
    id: "settings",
    name: "Paramètres",
    description: "Configuration générale de la plateforme",
    icon: Settings,
  },
];

const permissionLabels = [
  { key: "view", label: "Voir", icon: Eye },
  { key: "create", label: "Créer", icon: Plus },
  { key: "edit", label: "Modifier", icon: Pencil },
  { key: "delete", label: "Supprimer", icon: Trash2 },
] as const;

function createPermissions(
  level: "all" | "read" | "limited" | "none"
): Record<string, Permission> {
  return Object.fromEntries(
    modules.map((module) => {
      if (level === "all") {
        return [
          module.id,
          {
            view: true,
            create: true,
            edit: true,
            delete: true,
          },
        ];
      }

      if (level === "read") {
        return [
          module.id,
          {
            view: true,
            create: false,
            edit: false,
            delete: false,
          },
        ];
      }

      if (level === "limited") {
        return [
          module.id,
          {
            view: true,
            create: true,
            edit: true,
            delete: false,
          },
        ];
      }

      return [
        module.id,
        {
          view: false,
          create: false,
          edit: false,
          delete: false,
        },
      ];
    })
  );
}

const initialRoles: Role[] = [
  {
    id: 1,
    name: "Administrateur",
    description: "Accès complet à toute la plateforme",
    users: 2,
    protected: true,
    permissions: createPermissions("all"),
  },
  {
    id: 2,
    name: "Direction",
    description: "Accès aux projets, indicateurs et rapports",
    users: 3,
    protected: true,
    permissions: {
      ...createPermissions("read"),
      projects: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
      reports: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
      evaluations: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
    },
  },
  {
    id: 3,
    name: "DSI",
    description: "Gestion technique et administration des utilisateurs",
    users: 2,
    protected: true,
    permissions: {
      ...createPermissions("all"),
      reports: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
    },
  },
  {
    id: 4,
    name: "DAF",
    description: "Gestion administrative et financière",
    users: 2,
    protected: false,
    permissions: {
      ...createPermissions("read"),
      projects: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
      reports: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
    },
  },
  {
    id: 5,
    name: "RH",
    description: "Gestion des équipes et des utilisateurs",
    users: 1,
    protected: false,
    permissions: {
      ...createPermissions("read"),
      users: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
      evaluations: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
    },
  },
  {
    id: 6,
    name: "Communication",
    description: "Communication, notifications et rapports",
    users: 2,
    protected: false,
    permissions: {
      ...createPermissions("read"),
      notifications: {
        view: true,
        create: true,
        edit: true,
        delete: false,
      },
      reports: {
        view: true,
        create: true,
        edit: false,
        delete: false,
      },
    },
  },
];

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [selectedRoleId, setSelectedRoleId] = useState(1);
  const [search, setSearch] = useState("");
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openRoleMenu, setOpenRoleMenu] = useState<number | null>(null);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  const filteredRoles = useMemo(() => {
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        role.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [roles, search]);

  const updatePermission = (
    moduleId: string,
    permissionKey: keyof Permission
  ) => {
    if (!selectedRole || selectedRole.protected) return;

    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.id !== selectedRoleId) return role;

        const currentModule = role.permissions[moduleId];

        return {
          ...role,
          permissions: {
            ...role.permissions,
            [moduleId]: {
              ...currentModule,
              [permissionKey]: !currentModule[permissionKey],
            },
          },
        };
      })
    );

    setSaved(false);
  };

  const toggleAllModulePermissions = (moduleId: string) => {
    if (!selectedRole || selectedRole.protected) return;

    const permission = selectedRole.permissions[moduleId];

    const allEnabled =
      permission.view &&
      permission.create &&
      permission.edit &&
      permission.delete;

    setRoles((currentRoles) =>
      currentRoles.map((role) => {
        if (role.id !== selectedRoleId) return role;

        return {
          ...role,
          permissions: {
            ...role.permissions,
            [moduleId]: {
              view: !allEnabled,
              create: !allEnabled,
              edit: !allEnabled,
              delete: !allEnabled,
            },
          },
        };
      })
    );

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  const createRole = () => {
    if (!newRoleName.trim()) return;

    const newRole: Role = {
      id: Date.now(),
      name: newRoleName.trim(),
      description:
        newRoleDescription.trim() || "Nouveau rôle personnalisé",
      users: 0,
      protected: false,
      permissions: createPermissions("none"),
    };

    setRoles((current) => [...current, newRole]);
    setSelectedRoleId(newRole.id);

    setNewRoleName("");
    setNewRoleDescription("");
    setShowRoleForm(false);
  };

  const deleteRole = (id: number) => {
    const role = roles.find((item) => item.id === id);

    if (!role || role.protected) return;

    if (role.users > 0) {
      alert(
        "Ce rôle ne peut pas être supprimé car des utilisateurs lui sont encore associés."
      );
      return;
    }

    setRoles((current) => current.filter((item) => item.id !== id));

    if (selectedRoleId === id) {
      setSelectedRoleId(roles.find((item) => item.id !== id)?.id ?? 1);
    }

    setOpenRoleMenu(null);
  };

  const permissionCount = selectedRole
    ? Object.values(selectedRole.permissions).reduce(
        (total, permission) =>
          total +
          Object.values(permission).filter(Boolean).length,
        0
      )
    : 0;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f5f7fb",
        padding: "28px",
        color: "#172033",
      }}
    >
      <div
        style={{
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "20px",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  background: "#e8f0ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ShieldCheck size={25} color="#2563eb" />
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: 750,
                }}
              >
                Permissions & accès
              </h1>
            </div>

            <p
              style={{
                margin: 0,
                color: "#667085",
                fontSize: "15px",
              }}
            >
              Gérez les rôles et les droits d'accès aux différents modules
              de Ndao Hifanosika.
            </p>
          </div>

          <button
            onClick={handleSave}
            style={{
              border: "none",
              borderRadius: "10px",
              padding: "12px 18px",
              background: saved ? "#15803d" : "#2563eb",
              color: "#fff",
              fontWeight: 650,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(37,99,235,.18)",
            }}
          >
            {saved ? <Check size={18} /> : <Save size={18} />}
            {saved ? "Modifications enregistrées" : "Enregistrer"}
          </button>
        </header>

        {/* SECURITY INFO */}
        <section
          style={{
            background: "#fff",
            border: "1px solid #e4e7ec",
            borderRadius: "14px",
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <ShieldAlert size={22} color="#2563eb" />

          <div style={{ flex: 1 }}>
            <strong style={{ display: "block", marginBottom: "3px" }}>
              Gestion sécurisée des accès
            </strong>

            <span
              style={{
                color: "#667085",
                fontSize: "13px",
              }}
            >
              Les permissions déterminent les actions qu'un utilisateur peut
              effectuer sur chaque module de la plateforme.
            </span>
          </div>

          <span
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              background: "#ecfdf3",
              color: "#15803d",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            RBAC actif
          </span>
        </section>

        {/* CONTENT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "330px 1fr",
            gap: "22px",
            alignItems: "start",
          }}
        >
          {/* ROLES */}
          <aside
            style={{
              background: "#fff",
              border: "1px solid #e4e7ec",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "18px",
                borderBottom: "1px solid #eaecf0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <div>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: "17px",
                    }}
                  >
                    Rôles
                  </h2>

                  <span
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                    }}
                  >
                    {roles.length} rôles configurés
                  </span>
                </div>

                <button
                  onClick={() => setShowRoleForm((value) => !value)}
                  title="Créer un rôle"
                  style={{
                    width: "34px",
                    height: "34px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#2563eb",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={18} />
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                }}
              >
                <Search
                  size={17}
                  style={{
                    position: "absolute",
                    left: "11px",
                    top: "11px",
                    color: "#98a2b3",
                  }}
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher un rôle..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px 12px 10px 36px",
                    border: "1px solid #d0d5dd",
                    borderRadius: "9px",
                    outline: "none",
                    fontSize: "13px",
                  }}
                />
              </div>
            </div>

            {showRoleForm && (
              <div
                style={{
                  padding: "16px",
                  background: "#f8fafc",
                  borderBottom: "1px solid #eaecf0",
                }}
              >
                <input
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                  placeholder="Nom du rôle"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px",
                    border: "1px solid #d0d5dd",
                    borderRadius: "8px",
                    marginBottom: "8px",
                  }}
                />

                <textarea
                  value={newRoleDescription}
                  onChange={(event) =>
                    setNewRoleDescription(event.target.value)
                  }
                  placeholder="Description"
                  rows={3}
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "10px",
                    border: "1px solid #d0d5dd",
                    borderRadius: "8px",
                    resize: "vertical",
                    marginBottom: "8px",
                  }}
                />

                <button
                  onClick={createRole}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px",
                    background: "#15803d",
                    color: "#fff",
                    fontWeight: 650,
                    cursor: "pointer",
                  }}
                >
                  Créer le rôle
                </button>
              </div>
            )}

            <div style={{ padding: "8px" }}>
              {filteredRoles.map((role) => {
                const active = role.id === selectedRoleId;

                return (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    style={{
                      position: "relative",
                      padding: "13px",
                      borderRadius: "10px",
                      marginBottom: "4px",
                      cursor: "pointer",
                      background: active ? "#eff6ff" : "transparent",
                      border: active
                        ? "1px solid #bfdbfe"
                        : "1px solid transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          minWidth: 0,
                        }}
                      >
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            flexShrink: 0,
                            borderRadius: "9px",
                            background: active ? "#dbeafe" : "#f2f4f7",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <UserCog
                            size={17}
                            color={active ? "#2563eb" : "#667085"}
                          />
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: 650,
                              display: "flex",
                              alignItems: "center",
                              gap: "5px",
                            }}
                          >
                            {role.name}

                            {role.protected && (
                              <Lock size={12} color="#667085" />
                            )}
                          </div>

                          <div
                            style={{
                              fontSize: "11px",
                              color: "#667085",
                              marginTop: "3px",
                              lineHeight: 1.4,
                            }}
                          >
                            {role.users} utilisateur
                            {role.users > 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      {!role.protected && (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setOpenRoleMenu(
                              openRoleMenu === role.id ? null : role.id
                            );
                          }}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            color: "#667085",
                          }}
                        >
                          <ChevronDown size={17} />
                        </button>
                      )}
                    </div>

                    {openRoleMenu === role.id && (
                      <div
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "52px",
                          zIndex: 10,
                          width: "150px",
                          background: "#fff",
                          border: "1px solid #e4e7ec",
                          borderRadius: "9px",
                          boxShadow: "0 8px 24px rgba(16,24,40,.12)",
                          padding: "5px",
                        }}
                      >
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteRole(role.id);
                          }}
                          style={{
                            width: "100%",
                            border: "none",
                            background: "transparent",
                            padding: "9px",
                            textAlign: "left",
                            color: "#b42318",
                            cursor: "pointer",
                            borderRadius: "6px",
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <Trash2 size={14} />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* PERMISSIONS */}
          <section
            style={{
              background: "#fff",
              border: "1px solid #e4e7ec",
              borderRadius: "14px",
              overflow: "hidden",
            }}
          >
            {selectedRole && (
              <>
                <div
                  style={{
                    padding: "20px",
                    borderBottom: "1px solid #eaecf0",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "20px",
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "9px",
                        marginBottom: "5px",
                      }}
                    >
                      <h2
                        style={{
                          margin: 0,
                          fontSize: "20px",
                        }}
                      >
                        {selectedRole.name}
                      </h2>

                      {selectedRole.protected ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "#f2f4f7",
                            color: "#667085",
                            fontSize: "11px",
                            fontWeight: 650,
                          }}
                        >
                          <Lock size={12} />
                          Protégé
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            background: "#ecfdf3",
                            color: "#15803d",
                            fontSize: "11px",
                            fontWeight: 650,
                          }}
                        >
                          <Unlock size={12} />
                          Personnalisable
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        margin: 0,
                        color: "#667085",
                        fontSize: "13px",
                      }}
                    >
                      {selectedRole.description}
                    </p>
                  </div>

                  <div
                    style={{
                      textAlign: "right",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "22px",
                      }}
                    >
                      {permissionCount}
                    </strong>

                    <span
                      style={{
                        color: "#667085",
                        fontSize: "11px",
                      }}
                    >
                      permissions actives
                    </span>
                  </div>
                </div>

                {selectedRole.protected && (
                  <div
                    style={{
                      margin: "18px 20px 0",
                      padding: "12px 14px",
                      borderRadius: "9px",
                      background: "#fffaeb",
                      border: "1px solid #fedf89",
                      color: "#93370d",
                      fontSize: "12px",
                      display: "flex",
                      alignItems: "center",
                      gap: "9px",
                    }}
                  >
                    <Lock size={16} />
                    Ce rôle est protégé. Les permissions ne peuvent pas être
                    modifiées depuis cette interface.
                  </div>
                )}

                <div
                  style={{
                    overflowX: "auto",
                    padding: "20px",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      minWidth: "760px",
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "12px",
                            background: "#f8fafc",
                            borderBottom: "1px solid #e4e7ec",
                            fontSize: "12px",
                            color: "#667085",
                            width: "45%",
                          }}
                        >
                          MODULE
                        </th>

                        {permissionLabels.map((permission) => (
                          <th
                            key={permission.key}
                            style={{
                              padding: "12px",
                              background: "#f8fafc",
                              borderBottom: "1px solid #e4e7ec",
                              fontSize: "12px",
                              color: "#667085",
                            }}
                          >
                            {permission.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {modules.map((module) => {
                        const Icon = module.icon;
                        const permission =
                          selectedRole.permissions[module.id];

                        const allEnabled =
                          permission.view &&
                          permission.create &&
                          permission.edit &&
                          permission.delete;

                        return (
                          <tr key={module.id}>
                            <td
                              style={{
                                padding: "15px 12px",
                                borderBottom: "1px solid #eaecf0",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "11px",
                                }}
                              >
                                <div
                                  style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "9px",
                                    background: "#f2f4f7",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Icon size={18} color="#475467" />
                                </div>

                                <div>
                                  <div
                                    style={{
                                      fontWeight: 650,
                                      fontSize: "13px",
                                    }}
                                  >
                                    {module.name}
                                  </div>

                                  <div
                                    style={{
                                      color: "#98a2b3",
                                      fontSize: "11px",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {module.description}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {permissionLabels.map((item) => {
                              const enabled = permission[item.key];

                              return (
                                <td
                                  key={item.key}
                                  style={{
                                    textAlign: "center",
                                    borderBottom: "1px solid #eaecf0",
                                  }}
                                >
                                  <button
                                    disabled={selectedRole.protected}
                                    onClick={() =>
                                      updatePermission(
                                        module.id,
                                        item.key
                                      )
                                    }
                                    style={{
                                      width: "30px",
                                      height: "30px",
                                      borderRadius: "7px",
                                      border: enabled
                                        ? "1px solid #86efac"
                                        : "1px solid #d0d5dd",
                                      background: enabled
                                        ? "#dcfce7"
                                        : "#fff",
                                      color: enabled
                                        ? "#15803d"
                                        : "#98a2b3",
                                      cursor: selectedRole.protected
                                        ? "not-allowed"
                                        : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      opacity: selectedRole.protected
                                        ? 0.7
                                        : 1,
                                    }}
                                  >
                                    {enabled ? (
                                      <Check size={16} />
                                    ) : (
                                      <X size={15} />
                                    )}
                                  </button>
                                </td>
                              );
                            })}

                            <td
                              style={{
                                display: "none",
                              }}
                            >
                              {allEnabled ? "all" : "partial"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER */}
                <div
                  style={{
                    padding: "16px 20px",
                    borderTop: "1px solid #eaecf0",
                    background: "#fafafa",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    />
                    Permission active
                    <span style={{ margin: "0 5px" }}>•</span>
                    <div
                      style={{
                        width: "9px",
                        height: "9px",
                        borderRadius: "50%",
                        border: "1px solid #d0d5dd",
                        background: "#fff",
                      }}
                    />
                    Permission inactive
                  </div>

                  {!selectedRole.protected && (
                    <button
                      onClick={() => {
                        setRoles((currentRoles) =>
                          currentRoles.map((role) =>
                            role.id === selectedRoleId
                              ? {
                                  ...role,
                                  permissions: createPermissions("none"),
                                }
                              : role
                          )
                        );
                        setSaved(false);
                      }}
                      style={{
                        border: "1px solid #d0d5dd",
                        background: "#fff",
                        color: "#344054",
                        borderRadius: "8px",
                        padding: "9px 13px",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Réinitialiser les permissions
                    </button>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}