// Patient Types
export interface Patient {
  id: string;
  mrn: string; // Unified Medical Number (UMN)
  name: string;
  nameAr: string;
  dateOfBirth: string;
  gender: 'male' | 'female';
  bloodType: string;
  maritalStatus?: string;
  phone: string;
  email?: string;
  address: string;
  emergencyContact: string;
  profileImage?: string;
  chronicConditions: string[];
  allergies: string[];
  isFirstLogin?: boolean;
  activationCodeUsed?: boolean;
  nationalId?: string;
  verified?: boolean;
}

// Doctor Types
export interface Doctor {
  id: string;
  hospitalId?: string | null;
  hospitalName?: string | null;
  hospitalLocation?: string | null;
  name: string;
  nameAr: string;
  specialty: string;
  specialtyAr: string;
  department: string;
  departmentAr: string;
  phone: string;
  email?: string;
  photo?: string;
  availableDays: string[] | Record<string, string[]>;
  serviceUnit?: string | null;
}

// Appointment Types
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  doctorNameAr: string;
  doctorSpecialty: string;
  doctorSpecialtyAr: string;
  doctorPhoto: string;
  doctorPhone?: string | null;
  department: string;
  departmentAr: string;
  date: string;
  time: string;
  status: 'pending' | 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
  location: string;
}

// Report Types
export type ReportType = 'laboratory' | 'radiology' | 'medical';

export interface Report {
  id: string;
  patientId: string;
  type: ReportType;
  title: string;
  titleAr: string;
  date: string;
  doctorName: string;
  doctorNameAr: string;
  hospitalName?: string;
  hospitalLocation?: string;
  patientName?: string;
  patientNameAr?: string;
  status: 'ready' | 'pending';
  fileUrl?: string;
  details?: string;
  detailsAr?: string;
  suggestions?: string[];
  answers?: Record<string, string>;
}

// Notification Types
export type NotificationType = 'appointment' | 'report' | 'general' | 'reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  titleAr: string;
  message: string;
  messageAr: string;
  date: string;
  read: boolean;
  actionId?: string;
  actionType?: 'appointment' | 'report' | 'doctor';
}

// Specialty
export interface Specialty {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

// Hospital
export interface Hospital {
  id: string;
  name: string;
  location: string;
  phone: string;
  status: 'linked' | 'unlinked';
  logo?: string;
}

// Medical History
export interface MedicalHistory {
  id: string;
  condition: string;
  conditionAr: string;
  diagnosedDate: string;
  status: 'active' | 'resolved';
}

// Surgery
export interface Surgery {
  id: string;
  name: string;
  nameAr: string;
  date: string;
  hospital: string;
  hospitalAr: string;
  doctor: string;
  doctorAr: string;
}

// Medication
export interface Medication {
  id: string;
  name: string;
  nameAr: string;
  dosage: string;
  frequency: string;
  frequencyAr: string;
  duration?: string;
  durationAr?: string;
  prescribingDoctor: string;
  prescribingDoctorAr: string;
  status: 'current' | 'past';
  startDate: string;
  endDate?: string;
}
