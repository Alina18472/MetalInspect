"""add bbox fields to defects

Revision ID: 340c37cdeb33
Revises: 078bf6824add
Create Date: 2026-05-06 15:29:15.485296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '340c37cdeb33'
down_revision: Union[str, Sequence[str], None] = '078bf6824add'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column(
        "defects",
        sa.Column("bbox", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "defects",
        sa.Column("detections", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column(
        "defects",
        sa.Column("bbox_count", sa.Integer(), nullable=True),
    )


def downgrade():
    op.drop_column("defects", "bbox_count")
    op.drop_column("defects", "detections")
    op.drop_column("defects", "bbox")
