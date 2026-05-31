import enum

FORM_TYPES = {
    "Noon",
    "Arrival",
    "Departure",
    "Bunkering",
    "Statement of Facts",
}


class FormStatus(str, enum.Enum):
    RECEIVED = "Received"
    UNDER_REVIEW = "Under Review"
    QUERIED = "Queried"
    ACCEPTED = "Accepted"
    REJECTED = "Rejected"


class FormSourceType(str, enum.Enum):
    PASTE = "paste"


LEGAL_TRANSITIONS = {
    FormStatus.RECEIVED: {
        FormStatus.UNDER_REVIEW,
        FormStatus.ACCEPTED,
        FormStatus.REJECTED,
    },
    FormStatus.UNDER_REVIEW: {
        FormStatus.QUERIED,
        FormStatus.ACCEPTED,
        FormStatus.REJECTED,
    },
    FormStatus.QUERIED: {FormStatus.UNDER_REVIEW, FormStatus.REJECTED},
    FormStatus.ACCEPTED: set(),
    FormStatus.REJECTED: set(),
}
