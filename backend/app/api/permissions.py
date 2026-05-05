from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.security import get_current_user, require_permission
from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.role_permission import RolePermission


router = APIRouter(prefix="/permissions", tags=["permissions"])


class RolePermissionsUpdate(BaseModel):
    permission_codes: list[str]


def permission_to_dict(permission: Permission) -> dict:
    return {
        "id": permission.id,
        "code": permission.code,
        "name": permission.name,
        "description": permission.description,
    }


@router.get("/roles")
def get_roles_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("roles.manage")),
):
    roles = db.query(Role).order_by(Role.id.asc()).all()
    permissions = db.query(Permission).order_by(Permission.id.asc()).all()

    role_permissions = db.query(RolePermission).all()

    permissions_by_role = {}

    for rp in role_permissions:
        permissions_by_role.setdefault(rp.role_id, set()).add(rp.permission_id)

    result_roles = []

    for role in roles:
        role_permission_ids = permissions_by_role.get(role.id, set())

        result_roles.append({
            "role_id": role.id,
            "role_name": role.name,
            "permissions": [
                p.code for p in permissions if p.id in role_permission_ids
            ],
        })

    return {
        "permissions": [permission_to_dict(p) for p in permissions],
        "roles": result_roles,
    }


@router.put("/roles/{role_id}")
def update_role_permissions(
    role_id: int,
    data: RolePermissionsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    role = db.query(Role).filter(Role.id == role_id).first()

    if not role:
        raise HTTPException(status_code=404, detail="Role not found")

    permissions = (
        db.query(Permission)
        .filter(Permission.code.in_(data.permission_codes))
        .all()
    )

    found_codes = {p.code for p in permissions}
    requested_codes = set(data.permission_codes)

    unknown_codes = requested_codes - found_codes

    if unknown_codes:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown permissions: {', '.join(sorted(unknown_codes))}",
        )

    # Защита от случайной потери доступа:
    # у роли администратора всегда должны оставаться users.manage и roles.manage.
    if role_id == 1:
        required_admin_codes = {"users.manage", "roles.manage"}
        if not required_admin_codes.issubset(requested_codes):
            raise HTTPException(
                status_code=400,
                detail="У администратора нельзя отключить users.manage и roles.manage",
            )

    db.query(RolePermission).filter(RolePermission.role_id == role_id).delete()

    for permission in permissions:
        db.add(RolePermission(
            role_id=role_id,
            permission_id=permission.id,
        ))

    db.commit()

    return {
        "role_id": role.id,
        "role_name": role.name,
        "permissions": sorted(list(requested_codes)),
        "message": "Права роли обновлены",
    }


@router.get("/me")
def get_my_permissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rows = (
        db.query(Permission)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(RolePermission.role_id == current_user.role_id)
        .order_by(Permission.id.asc())
        .all()
    )

    return {
        "user_id": current_user.id,
        "role_id": current_user.role_id,
        "permissions": [p.code for p in rows],
    }