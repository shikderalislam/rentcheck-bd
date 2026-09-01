// Maps the six stored role strings onto the four product role groups the
// dashboards and permission checks use.
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

export function roleGroup(role) {
  return ROLE_GROUP[role] || "USER";
}

export function dashboardPath(role) {
  return DASHBOARD_PATH[roleGroup(role)] || "/dashboard";
}
