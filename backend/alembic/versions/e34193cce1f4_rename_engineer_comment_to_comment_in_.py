"""rename engineer_comment to comment in defects

Revision ID: e34193cce1f4
Revises: 9856667a08e9
Create Date: 2026-05-05 16:35:45.164755

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e34193cce1f4'
down_revision: Union[str, Sequence[str], None] = '9856667a08e9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
