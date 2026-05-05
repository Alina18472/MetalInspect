"""add mes fields to defects

Revision ID: 371147fb7ea9
Revises: 76cca0b3a953
Create Date: 2026-05-05 17:47:43.318258

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '371147fb7ea9'
down_revision: Union[str, Sequence[str], None] = '76cca0b3a953'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.add_column("defects", sa.Column("sent_to_mes_at", sa.DateTime(), nullable=True))
    op.add_column("defects", sa.Column("mes_status", sa.String(length=50), nullable=True))
    op.add_column("defects", sa.Column("mes_message", sa.Text(), nullable=True))


def downgrade():
    op.drop_column("defects", "mes_message")
    op.drop_column("defects", "mes_status")
    op.drop_column("defects", "sent_to_mes_at")
