import enum


class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    HOSPITAL_ADMIN = "HOSPITAL_ADMIN"


class Gender(str, enum.Enum):
    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"


class ConsultationMode(str, enum.Enum):
    IN_PERSON = "IN_PERSON"
    ONLINE = "ONLINE"


class SlotStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BOOKED = "BOOKED"
    CANCELLED = "CANCELLED"


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class CancelledBy(str, enum.Enum):
    PATIENT = "PATIENT"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"


class Severity(str, enum.Enum):
    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"


class CaseStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_TREATMENT = "IN_TREATMENT"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"


class ConditionStatus(str, enum.Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    WORSENING = "WORSENING"
    RESOLVED = "RESOLVED"


class PrescriptionStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    DISCONTINUED = "DISCONTINUED"


class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    VOICE = "VOICE"
    FILE = "FILE"
