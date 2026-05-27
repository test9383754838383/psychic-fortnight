from typing import List, Optional, TYPE_CHECKING, TypedDict
import enum
from sqlalchemy import String, JSON, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.modules.master_data.models.vessel import Base

if TYPE_CHECKING:
    from src.modules.master_data.models.counterparty_role import CounterpartyRole


class ContactDict(TypedDict):
    name: str
    email: str
    phone: str
    role_hint: Optional[str]


class CounterpartyStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class Counterparty(Base):
    __tablename__ = "counterparties"

    code: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(
        String(20), default=CounterpartyStatus.ACTIVE.value
    )
    contacts: Mapped[List[ContactDict]] = mapped_column(JSON, default=list)

    roles: Mapped[List["CounterpartyRole"]] = relationship(
        "CounterpartyRole",
        back_populates="counterparty",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        CheckConstraint(
            status.in_([e.value for e in CounterpartyStatus]),
            name="check_counterparty_status_enum",
        ),
    )
