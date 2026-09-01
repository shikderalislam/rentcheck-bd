// Mirror of backend/utils/roles.js — client-side only for routing/UI.
export const ROLE_GROUP = {
  tenant: "USER",
  landlord: "LANDLORD",
  property_manager: "LANDLORD",
  moderator: "MODERATOR",
  admin: "SUPER_ADMIN",
  super_admin: "SUPER_ADMIN",
};

export const DASHBOARD_PATH = {
  USER: "/dashboard",
  LANDLORD: "/landlord",
  MODERATOR: "/moderator",
  SUPER_ADMIN: "/admin",
};

export function roleGroupOf(user) {
  if (!user) return null;
  return user.roleGroup || ROLE_GROUP[user.role] || "USER";
}

export function dashboardPathOf(user) {
  return user?.dashboard || DASHBOARD_PATH[roleGroupOf(user)] || "/dashboard";
}
