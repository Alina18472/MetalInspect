"""add object storage fields to images

Revision ID: 87bc0baf8852
Revises: 340c37cdeb33
Create Date: 2026-05-07 15:01:57.659915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '87bc0baf8852'
down_revision: Union[str, Sequence[str], None] = '340c37cdeb33'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None




def upgrade():
    op.add_column(
        "images",
        sa.Column(
            "storage_type",
            sa.String(length=50),
            server_default="local",
            nullable=False,
        ),
    )

    op.add_column(
        "images",
        sa.Column("bucket", sa.String(length=255), nullable=True),
    )

    op.add_column(
        "images",
        sa.Column("object_key", sa.String(), nullable=True),
    )

    op.add_column(
        "images",
        sa.Column("content_type", sa.String(length=100), nullable=True),
    )

    op.add_column(
        "images",
        sa.Column("size_bytes", sa.BigInteger(), nullable=True),
    )

    op.alter_column(
        "images",
        "file_path",
        existing_type=sa.String(),
        nullable=True,
    )


def downgrade():
    op.alter_column(
        "images",
        "file_path",
        existing_type=sa.String(),
        nullable=False,
    )

    op.drop_column("images", "size_bytes")
    op.drop_column("images", "content_type")
    op.drop_column("images", "object_key")
    op.drop_column("images", "bucket")
    op.drop_column("images", "storage_type")