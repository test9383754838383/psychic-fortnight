import enum
import uuid
from typing import List, Optional, TYPE_CHECKING
from sqlalchemy import String, ForeignKey, JSON, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.modules.master_data.models.vessel import Base

if TYPE_CHECKING:
    from src.modules.master_data.models.counterparty import Counterparty


class CounterpartyRoleEnum(str, enum.Enum):
    OWNER = "Owner"
    CHARTERER = "Charterer"
    AGENT = "Agent"
    SUPPLIER = "Supplier"
    TECHNICAL_MANAGER = "TechnicalManager"


class CounterpartyRole(Base):
    __tablename__ = "counterparty_roles"

    counterparty_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("counterparties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    ports_serviced: Mapped[Optional[List[str]]] = mapped_column(JSON, nullable=True)
    nomination_contact_email: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )

    counterparty: Mapped["Counterparty"] = relationship(
        "Counterparty", back_populates="roles"
    )

    __table_args__ = (
        UniqueConstraint("counterparty_id", "role", name="uq_counterparty_role"),
        CheckConstraint(
            role.in_([e.value for e in CounterpartyRoleEnum]),
            name="check_counterparty_role_enum",
        ),
    )
