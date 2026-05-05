from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password

EMAIL = "admin2@test.com"
PASSWORD = "admin123"

def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == EMAIL).first()
        if user:
            print("User already exists:", user.email)
            return

        new_user = User(
            email=EMAIL,
            hashed_password=hash_password(PASSWORD),
            is_active=True,
            role_id=1,  # если у тебя роль admin = 1 (иначе поставь существующую)
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print("Created user:", new_user.id, new_user.email)
        print("Password:", PASSWORD)
    finally:
        db.close()

if __name__ == "__main__":
    main()
