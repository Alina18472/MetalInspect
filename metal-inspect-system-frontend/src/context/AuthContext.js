import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { api } from "../services/Api";

const AuthContext = createContext(null);

const readJsonArray = (key) => {
  const raw = localStorage.getItem(key);

  try {
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getPermissionCode = (permission) => {
  if (typeof permission === "string") return permission;

  return (
    permission?.code ||
    permission?.key ||
    permission?.permission_code ||
    permission?.slug ||
    ""
  );
};

const normalizePermissionCodes = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => getPermissionCode(item))
    .filter(Boolean);
};

const normalizePermissionDetails = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: item || index,
          code: item,
          name: item,
          title: item,
          description: "",
        };
      }

      const code = getPermissionCode(item);

      return {
        id: item?.id || code || index,
        code,
        name: item?.name || item?.title || item?.display_name || code,
        title: item?.name || item?.title || item?.display_name || code,
        description: item?.description || "",
      };
    })
    .filter((item) => item.code);
};

const clearAuthStorage = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user_email");
  localStorage.removeItem("role_id");
  localStorage.removeItem("user");
  localStorage.removeItem("permissions");
  localStorage.removeItem("permission_details");
};

export function AuthProvider({ children }) {
  const [accessToken, setAccessToken] = useState(() =>
    localStorage.getItem("access_token")
  );

  const [userEmail, setUserEmail] = useState(
    () => localStorage.getItem("user_email") || ""
  );

  const [roleId, setRoleId] = useState(
    () => Number(localStorage.getItem("role_id")) || 0
  );

  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");

    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [permissions, setPermissions] = useState(() =>
    normalizePermissionCodes(readJsonArray("permissions"))
  );

  const [permissionDetails, setPermissionDetails] = useState(() => {
    const savedDetails = readJsonArray("permission_details");

    if (savedDetails.length > 0) {
      return normalizePermissionDetails(savedDetails);
    }

    return normalizePermissionDetails(readJsonArray("permissions"));
  });

  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!accessToken;

  const loadPermissions = useCallback(async () => {
    try {
      const permissionsData = await api.getMyPermissions();

      const rawDetails = Array.isArray(permissionsData?.permission_details)
        ? permissionsData.permission_details
        : Array.isArray(permissionsData?.permissions)
        ? permissionsData.permissions
        : [];

      const normalizedDetails = normalizePermissionDetails(rawDetails);
      const normalizedCodes = normalizePermissionCodes(rawDetails);

      localStorage.setItem("permissions", JSON.stringify(normalizedCodes));
      localStorage.setItem(
        "permission_details",
        JSON.stringify(normalizedDetails)
      );

      setPermissions(normalizedCodes);
      setPermissionDetails(normalizedDetails);

      return normalizedCodes;
    } catch (e) {
      console.error("loadPermissions error:", e);
      return null;
    }
  }, []);

  const login = useCallback(
    async (email, password) => {
      setIsLoading(true);

      try {
        const data = await api.loginJson(email, password);

        if (!data?.access_token) {
          throw new Error("Сервер не вернул access_token");
        }

        if (!data?.user) {
          throw new Error("Сервер не вернул данные пользователя");
        }

        const role = Number(data.user.role_id) || 0;

        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("user_email", email);
        localStorage.setItem("role_id", String(role));
        localStorage.setItem("user", JSON.stringify(data.user));

        setAccessToken(data.access_token);
        setUserEmail(email);
        setRoleId(role);
        setUser(data.user);

        await loadPermissions();

        return { ok: true, role_id: role };
      } catch (e) {
        return {
          ok: false,
          error: e?.message || "Login failed",
        };
      } finally {
        setIsLoading(false);
      }
    },
    [loadPermissions]
  );

  const loadMe = useCallback(async () => {
    try {
      const me = await api.getMe();
      const role = Number(me.role_id) || 0;

      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(me));

      setRoleId(role);
      setUser(me);

      await loadPermissions();

      return { ok: true, user: me };
    } catch (e) {
      return {
        ok: false,
        error: e?.message || "Failed to load profile",
      };
    }
  }, [loadPermissions]);

  const updateMe = useCallback(async (payload) => {
    try {
      const me = await api.updateMe(payload);
      const role = Number(me.role_id) || 0;

      localStorage.setItem("role_id", String(role));
      localStorage.setItem("user", JSON.stringify(me));

      setRoleId(role);
      setUser(me);

      return { ok: true, user: me };
    } catch (e) {
      return {
        ok: false,
        error: e?.data?.detail || e?.message || "Failed to update profile",
      };
    }
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();

    setAccessToken(null);
    setUserEmail("");
    setRoleId(0);
    setUser(null);
    setPermissions([]);
    setPermissionDetails([]);
  }, []);

  const hasPermission = useCallback(
    (permissionCode) => {
      return permissions.includes(permissionCode);
    },
    [permissions]
  );

  const value = useMemo(
    () => ({
      accessToken,
      userEmail,
      roleId,
      user,
      permissions,
      permissionDetails,

      hasPermission,
      isAuthenticated,
      isLoading,
      login,
      loadMe,
      logout,
      updateMe,
      loadPermissions,
    }),
    [
      accessToken,
      userEmail,
      roleId,
      user,
      permissions,
      permissionDetails,
      hasPermission,
      isAuthenticated,
      isLoading,
      login,
      loadMe,
      logout,
      updateMe,
      loadPermissions,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return ctx;
}