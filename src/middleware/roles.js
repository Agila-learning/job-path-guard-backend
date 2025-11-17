export const ROLES = { ADMIN: "admin", HR: "hr", STAFF: "staff" };
export function allow(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next({ status: 401, message: "Unauthorized" });
    if (!roles.includes(req.user.role)) return next({ status: 403, message: "Forbidden" });
    next();
  };
}
