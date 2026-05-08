"""add bbox fields to defects

Revision ID: 340c37cdeb33
Revises: 078bf6824add
Create Date: 2026-05-06 15:29:15.485296

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '340c37cdeb33'
down_revision: Union[str, Sequence[str], None] = '078bf6824add'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    op.execute("ALTER TABLE defects ADD COLUMN IF NOT EXISTS bbox JSONB")
    op.execute("ALTER TABLE defects ADD COLUMN IF NOT EXISTS detections JSONB")
    op.execute("ALTER TABLE defects ADD COLUMN IF NOT EXISTS bbox_count INTEGER DEFAULT 0")

def downgrade():
    op.execute("ALTER TABLE defects DROP COLUMN IF EXISTS bbox_count")
    op.execute("ALTER TABLE defects DROP COLUMN IF EXISTS detections")
    op.execute("ALTER TABLE defects DROP COLUMN IF EXISTS bbox")