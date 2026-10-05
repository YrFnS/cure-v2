import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

type Language = 'ar' | 'en';
type Theme = 'light' | 'dark';

// Derive the initial language from the device locale, but only when the user
// has no stored preference. zustand's persist rehydrates from AsyncStorage after
// this initial value is set, so a stored choice (including an explicit 'ar')
// correctly overrides the device default instead of the other way around.
function getDeviceLanguage(): Language {
  try {
    const code = getLocales()[0]?.languageCode?.toLowerCase();
    if (!code) return 'en';
    return code === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

interface SettingsState {
  language: Language;
  languagePreference: Language | null;
  notificationsEnabled: boolean;
  theme: Theme;
  setLanguage: (lang: Language) => void;
  toggleNotifications: () => void;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      language: getDeviceLanguage(),
      languagePreference: null,
      notificationsEnabled: true,
      theme: 'light',

      setLanguage: (lang: Language) => {
        set({ language: lang, languagePreference: lang });
      },

      toggleNotifications: () => {
        set({ notificationsEnabled: !get().notificationsEnabled });
      },
      setTheme: (theme: Theme) => {
        set({ theme });
      },
      toggleTheme: () => {
        set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
      },
    }),
    {
      name: 'settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
      migrate: () => ({} as SettingsState),
      partialize: state => ({
        languagePreference: state.languagePreference,
        notificationsEnabled: state.notificationsEnabled,
        theme: state.theme,
      } as SettingsState),
      merge: (persisted, current) => {
        const stored = persisted as Partial<SettingsState>;
        const languagePreference = stored.languagePreference ?? null;
        return {
          ...current,
          language: languagePreference ?? current.language,
          languagePreference,
          notificationsEnabled: stored.notificationsEnabled ?? current.notificationsEnabled,
          theme: stored.theme ?? current.theme,
        };
      },
    }
  )
);

// Arabic translations
export const translations = {
  ar: {
    // Auth
    login: 'تسجيل الدخول',
    mrn: 'رقم السجل الطبي',
    password: 'كلمة المرور',
    forgotPassword: 'نسيت كلمة المرور؟',
    loginButton: 'دخول',
    welcomeBack: 'مرحباً بك',
    enterCredentials: 'أدخل بياناتك للوصول إلى سجلك الطبي',

    // Home
    home: 'الرئيسية',
    dashboard: 'لوحة التحكم',
    hello: 'مرحباً',
    medicalRecordNumber: 'رقم السجل الطبي',
    quickAccess: 'الوصول السريع',
    quickServices: 'الخدمات السريعة',
    medicalFile: 'الملف الطبي',
    laboratory: 'المختبر',
    radiology: 'الأشعة',
    hospitals: 'المستشفيات',
    linkedHospitals: 'المستشفيات المرتبطة',
    viewAll: 'عرض الكل',
    noUpcomingAppointments: 'لا توجد مواعيد قادمة',
    recentNotifications: 'آخر الإشعارات',
    umn: 'الرقم الطبي الموحد (UMN)',
    account: 'الحساب',
    notSpecified: 'غير محدد',
    clearFilter: 'مسح التصفية',
    noResults: 'لا توجد نتائج',
    awaitingApproval: 'بانتظار الموافقة',
    upcoming: 'قادم',
    completed: 'مكتمل',
    cancelled: 'ملغي',
    welcomeToCure: 'مرحباً بك في كيور',
    accountCreated: 'تم إنشاء حسابك بنجاح. راجع المستشفيات الداعمة لبدء الحجز.',
    medicalNumber: 'الرقم الطبي',
    noData: 'لا توجد بيانات',
    supportedHospitals: 'المستشفيات الداعمة',
    noSupportedHospitals: 'لا يوجد مستشفيات داعمة',
    otherHospitals: 'مستشفى آخر',
    reportCategories: 'أقسام التقارير',
    reportsCount: 'تقارير',
    recentReportsTitle: 'آخر التقارير',

    // Navigation
    appointments: 'المواعيد',
    doctors: 'الأطباء',
    reports: 'التقارير',
    labCode: 'رمز المختبر',
    labCodeHint: 'اعرض هذا الرمز على موظف المختبر عند أخذ العينة. صالح لمرة واحدة ولمدة 10 دقائق.',
    newLabCode: 'رمز جديد',
    askAboutResult: 'اسأل عن نتيجتك',
    aiDisclaimer: 'إجابات توضيحية بالذكاء الاصطناعي وليست تشخيصاً طبياً',
    directory: 'الدليل',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    notifications: 'الإشعارات',
    back: 'رجوع',
    notificationDetails: 'تفاصيل الإشعار',
    doctorDetails: 'تفاصيل الطبيب',
    medicalRecords: 'السجل الطبي',
    hospitalDetails: 'تفاصيل المستشفى',

    // Appointments
    upcomingAppointments: 'المواعيد القادمة',
    pastAppointments: 'المواعيد السابقة',
    newAppointment: 'موعد جديد',
    addAppointment: 'إضافة موعد',
    appointmentDetails: 'تفاصيل الموعد',
    bookAppointment: 'حجز موعد',
    cancelAppointment: 'إلغاء الموعد',
    noAppointments: 'لا توجد مواعيد',

    // Doctors
    searchDoctors: 'البحث عن طبيب',
    allDoctors: 'جميع الأطباء',
    specialty: 'التخصص',
    call: 'اتصال',
    book: 'حجز',
    filterBy: 'تصفية حسب',
    allSpecialties: 'جميع التخصصات',

    // Reports
    medicalReports: 'التقارير الطبية',
    laboratoryReports: 'تقارير المختبر',
    radiologyReports: 'تقارير الأشعة',
    generalReports: 'التقارير العامة',
    reportDetails: 'تفاصيل التقرير',
    downloadReport: 'تحميل التقرير',
    viewReport: 'عرض التقرير',
    noReports: 'لا توجد تقارير',
    ready: 'جاهز',
    pending: 'قيد الانتظار',
    noReportContent: 'لا يوجد محتوى تفصيلي في هذا التقرير',
    reportsLoadError: 'تعذر تحميل التقارير، تحقق من الاتصال وحاول مجددًا',

    // Profile
    personalInfo: 'المعلومات الشخصية',
    editProfile: 'تعديل الملف الشخصي',
    maritalStatus: 'الحالة الاجتماعية',
    province: 'المحافظة',
    notProvided: 'غير مقدم',
    name: 'الاسم',
    dateOfBirth: 'تاريخ الميلاد',
    gender: 'الجنس',
    male: 'ذكر',
    female: 'أنثى',
    bloodType: 'فصيلة الدم',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    address: 'العنوان',
    emergencyContact: 'جهة الاتصال للطوارئ',
    save: 'حفظ',
    cancel: 'إلغاء',

    // Settings
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    notificationSettings: 'إعدادات الإشعارات',
    enableNotifications: 'تفعيل الإشعارات',
    darkMode: 'الوضع الداكن',
    privacyPolicy: 'سياسة الخصوصية',
    termsOfService: 'شروط الاستخدام',
    requestAccountDeletion: 'طلب حذف الحساب',
    aboutApp: 'عن التطبيق',
    aboutAppBody: 'تطبيق كيور - بوابة المرضى الإلكترونية\n\nيوفر لك الوصول الآمن إلى سجلاتك الطبية من المستشفيات الداعمة في العراق.\n\n{version}\nمستشفيات e2next',
    logout: 'تسجيل الخروج',
    logoutConfirm: 'هل تريد تسجيل الخروج؟',
    yes: 'نعم',
    no: 'لا',
    version: 'الإصدار',
    cure: 'كيور',
    patientPortal: 'بوابة المرضى الإلكترونية',
    e2nextHospitals: 'مستشفيات e2next',

    // Validation Messages
    pleaseEnterFullName: 'الرجاء إدخال الاسم الكامل',
    pleaseEnterPhone: 'الرجاء إدخال رقم الهاتف',
    invalidPhoneFormat: 'رقم الهاتف يجب أن يكون عراقياً بصيغة 11 رقم (07XXXXXXXXX)',
    pleaseEnterEmergencyPhone: 'الرجاء إدخال رقم الطوارئ',
    invalidEmergencyPhoneFormat: 'رقم الطوارئ يجب أن يكون عراقياً بصيغة 11 رقم (07XXXXXXXXX)',
    pleaseEnterEmail: 'الرجاء إدخال البريد الإلكتروني',
    pleaseSelectGender: 'الرجاء اختيار الجنس',
    pleaseSelectProvince: 'الرجاء اختيار المحافظة',
    pleaseEnterAddress: 'الرجاء إدخال العنوان',
    pleaseEnterDob: 'الرجاء إدخال تاريخ الميلاد',
    pleaseSelectBloodType: 'الرجاء اختيار فصيلة الدم',
    pleaseSelectMaritalStatus: 'الرجاء اختيار الحالة الاجتماعية',
    pleaseEnterPassword: 'الرجاء إدخال كلمة المرور',
    passwordMinLength: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
    passwordsDoNotMatch: 'كلمتا المرور غير متطابقتين',
    pleaseEnterMrnOrPhone: 'الرجاء إدخال MRN/اسم المستخدم أو رقم الهاتف',
    onlyMrnOrPhoneAllowed: 'مسموح فقط: MRN أو اسم المستخدم أو رقم الهاتف',
    accountCreationFailed: 'فشل إنشاء الحساب',
    connectionFailed: 'فشل الاتصال',
    accountCreatedButMrnFailed: 'تم إنشاء الحساب لكن فشل إرسال MRN',
    telegramNotFoundError: 'تم إنشاء الحساب لكن لم يتم العثور على حساب تيليجرام لهذا الرقم. افتح البوت واضغط Start ثم أرسل رقم هاتفك بنفس صيغة التسجيل، ثم أعد المحاولة.',

    // Notifications
    allNotifications: 'جميع الإشعارات',
    unreadNotifications: 'غير مقروءة',
    noNotifications: 'لا توجد إشعارات',
    markAsRead: 'تحديد كمقروء',

    // General
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    search: 'بحث',
    filter: 'تصفية',
    all: 'الكل',
    today: 'اليوم',
    tomorrow: 'غداً',
    date: 'التاريخ',
    time: 'الوقت',
    location: 'الموقع',
    status: 'الحالة',
    details: 'التفاصيل',
    doctor: 'الطبيب',
  },
  en: {
    // Auth
    login: 'Login',
    mrn: 'Medical Record Number',
    password: 'Password',
    forgotPassword: 'Forgot Password?',
    loginButton: 'Login',
    welcomeBack: 'Welcome Back',
    enterCredentials: 'Enter your credentials to access your medical record',

    // Home
    home: 'Home',
    dashboard: 'Dashboard',
    hello: 'Hello',
    medicalRecordNumber: 'Medical Record Number',
    quickAccess: 'Quick Access',
    quickServices: 'Quick Services',
    medicalFile: 'Medical File',
    laboratory: 'Laboratory',
    radiology: 'Radiology',
    hospitals: 'Hospitals',
    linkedHospitals: 'Linked Hospitals',
    viewAll: 'View All',
    noUpcomingAppointments: 'No upcoming appointments',
    recentNotifications: 'Recent Notifications',
    umn: 'Unified Medical Number (UMN)',
    account: 'Account',
    notSpecified: 'Not specified',
    clearFilter: 'Clear Filter',
    noResults: 'No results',
    awaitingApproval: 'Awaiting Approval',
    upcoming: 'Upcoming',
    completed: 'Completed',
    cancelled: 'Cancelled',
    welcomeToCure: 'Welcome to Cure',
    accountCreated: 'Your account has been created. Check supported hospitals to start booking.',
    medicalNumber: 'Medical Number',
    noData: 'No data available',
    supportedHospitals: 'Supported Hospitals',
    noSupportedHospitals: 'No supported hospitals',
    otherHospitals: 'other hospital(s)',
    reportCategories: 'Report Categories',
    reportsCount: 'reports',
    recentReportsTitle: 'Recent Reports',

    // Navigation
    appointments: 'Appointments',
    doctors: 'Doctors',
    reports: 'Reports',
    labCode: 'Lab Code',
    labCodeHint: 'Show this code to the lab staff when your sample is taken. Single use, valid for 10 minutes.',
    newLabCode: 'New code',
    askAboutResult: 'Ask about your result',
    aiDisclaimer: 'AI explanations, not a medical diagnosis',
    directory: 'Directory',
    profile: 'Profile',
    settings: 'Settings',
    notifications: 'Notifications',
    back: 'Back',
    notificationDetails: 'Notification Details',
    doctorDetails: 'Doctor Details',
    medicalRecords: 'Medical Record',
    hospitalDetails: 'Hospital Details',

    // Appointments
    upcomingAppointments: 'Upcoming Appointments',
    pastAppointments: 'Past Appointments',
    newAppointment: 'New Appointment',
    addAppointment: 'Add Appointment',
    appointmentDetails: 'Appointment Details',
    bookAppointment: 'Book Appointment',
    cancelAppointment: 'Cancel Appointment',
    noAppointments: 'No appointments',

    // Doctors
    searchDoctors: 'Search Doctors',
    allDoctors: 'All Doctors',
    specialty: 'Specialty',
    call: 'Call',
    book: 'Book',
    filterBy: 'Filter By',
    allSpecialties: 'All Specialties',

    // Reports
    medicalReports: 'Medical Reports',
    laboratoryReports: 'Laboratory Reports',
    radiologyReports: 'Radiology Reports',
    generalReports: 'General Reports',
    reportDetails: 'Report Details',
    downloadReport: 'Download Report',
    viewReport: 'View Report',
    noReports: 'No reports',
    ready: 'Ready',
    pending: 'Pending',
    noReportContent: 'This report has no detailed content yet',
    reportsLoadError: "Couldn't load reports. Check your connection and try again",

    // Profile
    personalInfo: 'Personal Information',
    editProfile: 'Edit Profile',
    maritalStatus: 'Marital Status',
    province: 'Province',
    notProvided: 'Not provided',
    name: 'Name',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    male: 'Male',
    female: 'Female',
    bloodType: 'Blood Type',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    emergencyContact: 'Emergency Contact',
    save: 'Save',
    cancel: 'Cancel',

    // Settings
    language: 'Language',
    arabic: 'العربية',
    english: 'English',
    notificationSettings: 'Notification Settings',
    enableNotifications: 'Enable Notifications',
    darkMode: 'Dark mode',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    requestAccountDeletion: 'Request Account Deletion',
    aboutApp: 'About App',
    aboutAppBody: 'Cure - Patient Portal\n\nGives you secure access to your medical records from the supporting hospitals in Iraq.\n\n{version}\ne2next Hospitals',
    logout: 'Logout',
    logoutConfirm: 'Do you want to logout?',
    yes: 'Yes',
    no: 'No',
    version: 'Version',
    cure: 'Cure',
    patientPortal: 'Patient Portal',
    e2nextHospitals: 'e2next Hospitals',

    // Validation Messages
    pleaseEnterFullName: 'Please enter your full name',
    pleaseEnterPhone: 'Please enter phone number',
    invalidPhoneFormat: 'Phone number must be Iraqi format with 11 digits (07XXXXXXXXX)',
    pleaseEnterEmergencyPhone: 'Please enter emergency phone',
    invalidEmergencyPhoneFormat: 'Emergency phone must be Iraqi format with 11 digits (07XXXXXXXXX)',
    pleaseEnterEmail: 'Please enter email',
    pleaseSelectGender: 'Please select gender',
    pleaseSelectProvince: 'Please select province',
    pleaseEnterAddress: 'Please enter address',
    pleaseEnterDob: 'Please enter date of birth',
    pleaseSelectBloodType: 'Please select blood type',
    pleaseSelectMaritalStatus: 'Please select marital status',
    pleaseEnterPassword: 'Please enter password',
    passwordMinLength: 'Password must be at least 6 characters',
    passwordsDoNotMatch: 'Passwords do not match',
    pleaseEnterMrnOrPhone: 'Please enter MRN/username or phone number',
    onlyMrnOrPhoneAllowed: 'Only MRN, username, or phone number allowed',
    accountCreationFailed: 'Account creation failed',
    connectionFailed: 'Connection failed',
    accountCreatedButMrnFailed: 'Account created but failed to send MRN',
    telegramNotFoundError: 'Account created but no Telegram account found for this number. Open the bot and press Start, then send your phone number in the same format, then try again.',

    // Notifications
    allNotifications: 'All Notifications',
    unreadNotifications: 'Unread',
    noNotifications: 'No notifications',
    markAsRead: 'Mark as read',

    // General
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    search: 'Search',
    filter: 'Filter',
    all: 'All',
    today: 'Today',
    tomorrow: 'Tomorrow',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    status: 'Status',
    details: 'Details',
    doctor: 'Doctor',
  },
};

export const useTranslation = () => {
  const language = useSettingsStore(s => s.language);
  const t = translations[language];
  const isRTL = language === 'ar';

  return { t, isRTL, language };
};
