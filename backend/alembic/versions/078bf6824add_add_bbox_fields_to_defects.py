"""add bbox fields to defects

Revision ID: 078bf6824add
Revises: 371147fb7ea9
Create Date: 2026-05-05 18:18:15.588518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '078bf6824add'
down_revision: Union[str, Sequence[str], None] = '371147fb7ea9'
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