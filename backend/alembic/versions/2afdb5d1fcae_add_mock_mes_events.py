"""add mock mes events

Revision ID: 2afdb5d1fcae
Revises: 87bc0baf8852
Create Date: 2026-05-13 13:46:36.127833

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "2afdb5d1fcae"
down_revision: Union[str, Sequence[str], None] = "87bc0baf8852"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    op.create_table(
        "mes_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("defect_id", sa.Integer(), nullable=True),
        sa.Column("inspection_id", sa.Integer(), nullable=True),
        sa.Column("ingot_id", sa.String(length=100), nullable=True),
        sa.Column("external_event_id", sa.String(length=100), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("response_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=True),
        sa.Column("processed_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["defect_id"], ["defects.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["inspection_id"], ["inspections.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("external_event_id"),
    )

    op.add_column(
        "defects",
        sa.Column("mes_external_id", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_column("defects", "mes_external_id")
    op.drop_table("mes_events")