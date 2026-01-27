export const translations = {
    tr: {
        // Home Page
        appName: "Precious Memories 💕",
        selectCategory: "Takip etmek istediğin listeyi seç.",
        settings: "Ayarlar",
        logout: "Çıkış Yap",
        addCategory: "Yeni Kategori Ekle",
        privateCategory: "Gizli Kategori",
        keepPrivate: "Bu kategoriyi gizli tut (partnerden gizle)",
        privateNote: "Gizli kategoriler partneriniz tarafından görülemez",

        // Login Page
        welcome: "Tekrar Hoşgeldin!",
        createAccount: "Hesap Oluştur",
        loginSubtitle: "Precious Memories'a devam etmek için giriş yap.",
        registerSubtitle: "Yeni bir macera için kayıt ol.",
        fullName: "Ad Soyad",
        email: "Email",
        password: "Şifre",
        confirmPassword: "Şifre Tekrar",
        loginButton: "Giriş Yap",
        registerButton: "Kayıt Ol",
        loggingIn: "Giriş yapılıyor...",
        registering: "Kaydediliyor...",
        haveAccount: "Zaten hesabın var mı?",
        noAccount: "Hesabın yok mu?",

        // Category Page
        pending: "Bekliyor",
        completed: "Tamamlandı",
        all: "Hepsi",
        toggleStatus: "Durumu Değiştir",
        edit: "Düzenle",
        delete: "Sil",

        // Add Item
        addItem: "Yeni Öğe Ekle",
        manualAdd: "Manuel Ekle",
        bulkAdd: "Toplu Ekle",
        itemName: "Öğe Adı",
        description: "Açıklama",
        category: "Kategori",
        save: "Kaydet",
        saving: "Kaydediliyor...",

        // Settings
        partnerConnection: "Partner Bağlantısı",
        shareLife: "Hayatınızı birlikte takip edin",
        myProfile: "Profilim",
        displayName: "Görünen Adınız",
        partnerId: "Partner ID",
        connect: "Bağlan",
        disconnect: "Bağlantıyı Kes",

        // Toast Messages
        success: "Başarılı!",
        error: "Hata!",
        itemExists: "Bu öğe zaten listenizde var!",
        deleteConfirm: "Bu öğeyi silmek istediğine emin misin?",
        disconnectConfirm: "Partnerinizle bağlantıyı kesmek istediğinize emin misiniz?",
    },
    en: {
        // Home Page
        appName: "Precious Memories 💕",
        selectCategory: "Select the list you want to track.",
        settings: "Settings",
        logout: "Logout",
        addCategory: "Add New Category",
        privateCategory: "Private Category",
        keepPrivate: "Keep this category private (hidden from partner)",
        privateNote: "Private categories are hidden from your partner",

        // Login Page
        welcome: "Welcome Back!",
        createAccount: "Create Account",
        loginSubtitle: "Log in to continue to Precious Memories.",
        registerSubtitle: "Sign up for a new adventure.",
        fullName: "Full Name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        loginButton: "Login",
        registerButton: "Register",
        loggingIn: "Logging in...",
        registering: "Registering...",
        haveAccount: "Already have an account?",
        noAccount: "Don't have an account?",

        // Category Page
        pending: "Pending",
        completed: "Completed",
        all: "All",
        toggleStatus: "Toggle Status",
        edit: "Edit",
        delete: "Delete",

        // Add Item
        addItem: "Add New Item",
        manualAdd: "Manual Add",
        bulkAdd: "Bulk Add",
        itemName: "Item Name",
        description: "Description",
        category: "Category",
        save: "Save",
        saving: "Saving...",

        // Settings
        partnerConnection: "Partner Connection",
        shareLife: "Track your life together",
        myProfile: "My Profile",
        displayName: "Your Display Name",
        partnerId: "Partner ID",
        connect: "Connect",
        disconnect: "Disconnect",

        // Toast Messages
        success: "Success!",
        error: "Error!",
        itemExists: "This item already exists in your list!",
        deleteConfirm: "Are you sure you want to delete this item?",
        disconnectConfirm: "Are you sure you want to disconnect from your partner?",
    },
};

export type Language = 'tr' | 'en';
export type TranslationKey = keyof typeof translations.tr;
