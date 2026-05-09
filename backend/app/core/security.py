from datetime import datetime, timedelta
from jose import jwt, JWTError
from passlib.context import CryptContext

from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.models.user import User
from app.core.database import get_db
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session



from app.models.permission import Permission
from app.models.role_permission import RolePermission
SECRET_KEY = "CHANGE_ME_SUPER_SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")



oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")




def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

def get_user_from_token(db: Session, token: str) -> User:
    payload = decode_token(token)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Token has no subject")

    try:
        user_id = int(sub)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid token subject")

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")

    return user

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    return get_user_from_token(db, token)


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if int(current_user.role_id) != 1:
        raise HTTPException(status_code=403, detail="Forbidden")
    return current_user

def user_has_permission(
    db: Session,
    user: User,
    permission_code: str,
) -> bool:
    if not user or not user.role_id:
        return False

    permission_exists = (
        db.query(Permission.id)
        .join(RolePermission, RolePermission.permission_id == Permission.id)
        .filter(
            RolePermission.role_id == user.role_id,
            Permission.code == permission_code,
        )
        .first()
    )

    return permission_exists is not None


def require_permission(permission_code: str):
    def dependency(
        db: Session = Depends(get_db),
        current_user: User = Depends(get_current_user),
    ):
        if not user_has_permission(db, current_user, permission_code):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Недостаточно прав: {permission_code}",
            )

        return current_user

    return dependency