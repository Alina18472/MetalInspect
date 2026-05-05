"""add permissions and role permissions

Revision ID: 76cca0b3a953
Revises: e34193cce1f4
Create Date: 2026-05-05 17:09:10.927386

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '76cca0b3a953'
down_revision: Union[str, Sequence[str], None] = 'e34193cce1f4'
branch_labels = None
depends_on = None


permissions_table = sa.table(
    "permissions",
    sa.column("id", sa.Integer),
    sa.column("code", sa.String),
    sa.column("name", sa.String),
    sa.column("description", sa.Text),
)

role_permissions_table = sa.table(
    "role_permissions",
    sa.column("role_id", sa.Integer),
    sa.column("permission_id", sa.Integer),
)


def upgrade():
    op.create_table(
        "permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_index(
        "ix_permissions_code",
        "permissions",
        ["code"],
        unique=True,
    )

    op.create_table(
        "role_permissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("role_id", sa.Integer(), nullable=False),
        sa.Column("permission_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["permission_id"], ["permissions.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("role_id", "permission_id", name="uq_role_permission"),
    )

    op.create_index(
        "ix_role_permissions_role_id",
        "role_permissions",
        ["role_id"],
    )

    op.create_index(
        "ix_role_permissions_permission_id",
        "role_permissions",
        ["permission_id"],
    )

    op.bulk_insert(
        permissions_table,
        [
            {
                "id": 1,
                "code": "dashboard.view",
                "name": "Главная панель",
                "description": "Доступ к главному экрану оператора",
            },
            {
                "id": 2,
                "code": "camera.control",
                "name": "Управление камерой",
                "description": "Запуск и остановка имитации камеры",
            },
            {
                "id": 3,
                "code": "shift.control",
                "name": "Управление сменой",
                "description": "Запуск и остановка AI-анализа смены",
            },
            {
                "id": 4,
                "code": "journal.view",
                "name": "Журнал",
                "description": "Просмотр журнала проверок и дефектов",
            },
            {
                "id": 5,
                "code": "defects.review",
                "name": "Проверка дефектов",
                "description": "Подтверждение и отклонение дефектных событий",
            },
            {
                "id": 6,
                "code": "stats.view",
                "name": "Статистика",
                "description": "Просмотр статистики контроля качества",
            },
            {
                "id": 7,
                "code": "ai_models.manage",
                "name": "AI-модели",
                "description": "Управление моделями и настройками AI",
            },
            {
                "id": 8,
                "code": "users.manage",
                "name": "Пользователи",
                "description": "Создание, редактирование и удаление пользователей",
            },
            {
                "id": 9,
                "code": "roles.manage",
                "name": "Права доступа",
                "description": "Настройка прав доступа по ролям",
            },
        ],
    )

    # role_id=1 — Администратор
    # role_id=2 — Инженер
    op.bulk_insert(
        role_permissions_table,
        [
            # Админ — все права
            {"role_id": 1, "permission_id": 1},
            {"role_id": 1, "permission_id": 2},
            {"role_id": 1, "permission_id": 3},
            {"role_id": 1, "permission_id": 4},
            {"role_id": 1, "permission_id": 5},
            {"role_id": 1, "permission_id": 6},
            {"role_id": 1, "permission_id": 7},
            {"role_id": 1, "permission_id": 8},
            {"role_id": 1, "permission_id": 9},

            # Инженер — рабочие права
            {"role_id": 2, "permission_id": 1},
            {"role_id": 2, "permission_id": 2},
            {"role_id": 2, "permission_id": 3},
            {"role_id": 2, "permission_id": 4},
            {"role_id": 2, "permission_id": 5},
            {"role_id": 2, "permission_id": 6},
        ],
    )


def downgrade():
    op.drop_index("ix_role_permissions_permission_id", table_name="role_permissions")
    op.drop_index("ix_role_permissions_role_id", table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_index("ix_permissions_code", table_name="permissions")
    op.drop_table("permissions")