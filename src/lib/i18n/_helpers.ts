// i18n 内部辅助 — I18nDict 接口、ENGLISH_DEFAULTS 英文基准、dict 工厂、plural 函数

// ============================================================
// I18nDict — 全站翻译键接口（复刻 Kapci "英文原文作 key" 架构）
// 每个字段的英文原文本体由 ENGLISH_DEFAULTS 提供；语言文件只覆盖已翻译的键，
// 缺失的键自动回退英文原文（Kapci 核心行为：永远可读，绝无缺词/空白）
// ============================================================
export interface I18nDict {
  brandName: string;
  brandNameShort: string;
  heroTitlePrefix: string;
  heroTitleHighlight: string;
  heroBadge: string;
  heroSubtitle: string;
  heroTrust1: string;
  heroTrust2: string;
  heroTrust3: string;
  heroCta: string;
  navSearch: string;
  navProducts: string;
  navAbout: string;
  navFormulaSearch: string;
  navColorLibrary: string;
  navTds: string;
  navFavorites: string;
  navAdmin: string;
  userManagement: string;
  logout: string;
  loginWelcome: string;
  loginSubtitle: string;
  loginEmail: string;
  loginPassword: string;
  loginPlaceholderEmail: string;
  loginPlaceholderPassword: string;
  loginButton: string;
  loginSigningIn: string;
  forgotPassword: string;
  or: string;
  continueWithGoogle: string;
  continueWithFacebook: string;
  noAccount: string;
  signUp: string;
  login: string;
  close: string;
  brandSlogan: string;
  officialWebsite: string;
  loginMobileTitle: string;
  loginErrorEmpty: string;
  loginErrorNetwork: string;
  loginErrorFailed: string;
  loginErrorInvalid: string;
  loginResetSuccess: string;
  loginConfirmed: string;
  oauthGoogleFailed: string;
  oauthFacebookFailed: string;
  oauthUnavailable: string;
  loginRegisterLink: string;
  registerWelcome: string;
  registerSubtitle: string;
  registerTitle: string;
  registerButton: string;
  registerConfirmLabel: string;
  registerConfirmPlaceholder: string;
  registerPasswordPlaceholder: string;
  registerConfirmEmail: string;
  registerSuccess: string;
  backToLogin: string;
  haveAccount: string;
  loginLink: string;
  registerErrorExists: string;
  registerErrorFormat: string;
  registerErrorPassword: string;
  registerErrorMismatch: string;
  registerLoginLink: string;
  registerErrorFailed: string;
  panelTitle: string;
  make: string;
  colorCode: string;
  colorName: string;
  colorType: string;
  allMakes: string;
  colorTypeAll: string;
  colorTypeSolid: string;
  colorTypeMetallic: string;
  colorTypePearl: string;
  colorTypeMatte: string;
  colorTypeCandy: string;
  search: string;
  searching: string;
  reset: string;
  searchHistory: string;
  clearHistory: string;
  codeTooLong: string;
  colorCodePlaceholder: string;
  colorNamePlaceholder: string;
  year: string;
  yearPlaceholder: string;
  yearSingle: string;
  yearRange: string;
  formulasCount: (n: number) => string;
  detail: string;
  expand: string;
  collapse: string;
  viewMore: string;
  version: string;
  paintSystemNotes: string;
  volume: string;
  tonerCode: string;
  tonerName: string;
  percentage: string;
  actualAmount: string;
  colorInfo: string;
  formulaVariants: string;
  components: string;
  makeLabel: string;
  typeLabel: string;
  yearsLabel: string;
  codeLabel: string;
  print: string;
  copy: string;
  notesLabel: string;
  updatedLabel: string;
  colorTypeSolidLabel: string;
  colorTypeMetallicLabel: string;
  colorTypePearlLabel: string;
  colorTypeMatteLabel: string;
  colorTypeCandyLabel: string;
  colorTypeSpecialLabel: string;
  copySuccess: string;
  copyFail: string;
  favorite: string;
  favorited: string;
  favoriteAdded: string;
  favoriteRemoved: string;
  favoriteFail: string;
  removeFavorite: string;
  favoritesTitle: string;
  favoritesEmpty: string;
  favoritesEmptyHint: string;
  favoritesSearchPlaceholder: string;
  weight: string;
  accum: string;
  massTone: string;
  colorPreview: string;
  hexInputLabel: string;
  tabColorInfo: string;
  tabColorDocs: string;
  tabPlasticParts: string;
  manufacturerLabel: string;
  emptyState: string;
  totalWeightLabel: string;
  pearlPaintLabel: string;
  groundPaintLabel: string;
  originLabel: string;
  processLabel: string;
  searchHint: string;
  noResults: string;
  noResultsHint: string;
  foundCount: (n: number) => string;
  truncatedHint: (max: number) => string;
  totalFormula: (c: number, f: number) => string;
  colorsBadge: (n: number) => string;
  formulasBadge: (n: number) => string;
  versionLabel: string;
  pageSizeLabel: string;
  previousPage: string;
  nextPage: string;
  pageOf: (current: number, total: number) => string;
  foundFormulas: (n: number) => string;
  carModelLabel: string;
  tdsSearchPlaceholder: string;
  tdsCategories: string;
  tdsAllCategories: string;
  tdsListLabel: string;
  tdsSelectHint: string;
  tdsBackToList: string;
  tdsTableOfContents: string;
  tdsDocTypeAll: string;
  tdsDocTypeTds: string;
  tdsDocTypeMsds: string;
  tdsDocTypeSds: string;
  tdsDocTypeManual: string;
  tdsTypeAll: string;
  tdsLoading: string;
  tdsNotFound: string;
  tdsBack: string;
  tdsDragHint: string;
  tdsHideToc: string;
  adminTitle: string;
  adminNewUser: string;
  adminNoPermission: string;
  adminPasswordRequired: string;
  adminCannotDeleteAdmin: string;
  adminLoading: string;
  adminColId: string;
  adminColUsername: string;
  adminColRole: string;
  adminColCreatedAt: string;
  adminColActions: string;
  adminRoleAdmin: string;
  adminRoleUser: string;
  adminEdit: string;
  adminDelete: string;
  adminEditTitle: string;
  adminLabelPassword: string;
  adminPasswordHint: string;
  adminPasswordPlaceholder: string;
  adminLabelRole: string;
  adminCancel: string;
  adminSave: string;
  adminCreate: string;
  adminConfirmDelete: (username: string) => string;
}

// 通用复数
export const plural = (n: number, one: string, many: string) => `${n} ${n !== 1 ? many : one}`;

// ============================================================
// ENGLISH_DEFAULTS — 英文原文基准表
// 这是"英文原文即译文"层（对应 Kapci 英文翻译文件 97% key===value）。
// 任何语言文件未提供的键，都从这里取英文原文回退。
// ============================================================
export const ENGLISH_DEFAULTS: I18nDict = {
  brandName: "HIWE Formula Search",
  brandNameShort: "HIWE",
  heroTitlePrefix: "Find Your",
  heroTitleHighlight: "Perfect Match",
  heroBadge: "Professional Refinish Formula System",
  heroSubtitle: "Instant formula match by brand, year, or color code.",
  heroTrust1: "500,000+ Formulas",
  heroTrust2: "50+ Auto Brands",
  heroTrust3: "Global Paint Database",
  heroCta: "Explore Now",
  navSearch: "Search",
  navProducts: "Products",
  navAbout: "About",
  navFormulaSearch: "Formula Search",
  navColorLibrary: "Toner",
  navTds: "Technical Data Sheets",
  navFavorites: "Favorites",
  navAdmin: "Data Management",
  userManagement: "User Management",
  logout: "Logout",
  loginWelcome: "Welcome back",
  loginSubtitle: "Enter your credentials to access the system",
  loginEmail: "Username",
  loginPassword: "Password",
  loginPlaceholderEmail: "Enter your username",
  loginPlaceholderPassword: "Enter your password",
  loginButton: "Get started",
  loginSigningIn: "Signing in...",
  forgotPassword: "Forgot password?",
  or: "or",
  continueWithGoogle: "Continue with Google",
  continueWithFacebook: "Continue with Facebook",
  noAccount: "Don't have an account?",
  signUp: "Sign up",
  login: "Login",
  close: "Close",
  brandSlogan: "CAR REFINISH FORMULA SYSTEM",
  officialWebsite: "Official website",
  loginMobileTitle: "Welcome to HAIWEN",
  loginErrorEmpty: "Please enter username and password",
  loginErrorNetwork: "Network error, please retry",
  loginErrorFailed: "Login failed",
  loginErrorInvalid: "Invalid email or password. If you signed up with Google or Facebook, use the social login buttons below.",
  loginResetSuccess: "Password updated. Please sign in with your new password.",
  loginConfirmed: "Email confirmed. Please sign in.",
  oauthGoogleFailed: "Google sign-in failed",
  oauthFacebookFailed: "Facebook sign-in failed",
  oauthUnavailable: "Social sign-in is temporarily unavailable",
  loginRegisterLink: "No account? Register",
  registerWelcome: "Welcome New Friend",
  registerSubtitle: "Create your account to get started",
  registerTitle: "Create account",
  registerButton: "Register",
  registerConfirmLabel: "Confirm Password",
  registerConfirmPlaceholder: "Re-enter password",
  registerPasswordPlaceholder: "At least 8 characters",
  registerConfirmEmail: "Account created. Please check your email to confirm your account, then sign in.",
  registerSuccess: "Registration successful, signing in...",
  backToLogin: "Back to login",
  haveAccount: "Already have an account?",
  loginLink: "Log in",
  registerErrorExists: "Username already exists",
  registerErrorFormat: "Username must be 3-20 chars: start with a letter, only letters/numbers/_",
  registerErrorPassword: "Password must be at least 8 characters",
  registerErrorMismatch: "Passwords do not match",
  registerLoginLink: "Already have an account? Sign in",
  registerErrorFailed: "Registration failed",
  panelTitle: "Formula Search",
  make: "Make",
  colorCode: "Color Code",
  colorName: "Color Name",
  colorType: "Color Type",
  allMakes: "All Makes",
  colorTypeAll: "All",
  colorTypeSolid: "Solid",
  colorTypeMetallic: "Metallic",
  colorTypePearl: "Pearl",
  colorTypeMatte: "Matte",
  colorTypeCandy: "Candy",
  search: "Search",
  searching: "Searching...",
  reset: "Reset",
  searchHistory: "Search History",
  clearHistory: "Clear",
  codeTooLong: "Color code is usually <= 10 chars, please check",
  colorCodePlaceholder: "e.g. 040, NH731P",
  colorNamePlaceholder: "e.g. Super White",
  year: "Year",
  yearPlaceholder: "e.g. 2020 or 2018-2022",
  yearSingle: "Single",
  yearRange: "Range",
  formulasCount: (n) => plural(n, "formula", "formulas"),
  detail: "Detail",
  expand: "Expand",
  collapse: "Collapse",
  viewMore: "View More",
  version: "Version",
  paintSystemNotes: "Notes",
  volume: "Volume",
  tonerCode: "Toner Code",
  tonerName: "Toner Name",
  percentage: "Percentage(%)",
  actualAmount: "Actual Amount(g)",
  colorInfo: "Color Info",
  formulaVariants: "Formula Variants",
  components: "Components",
  makeLabel: "Make",
  typeLabel: "Type",
  yearsLabel: "Years",
  codeLabel: "Code",
  print: "Print",
  copy: "Copy",
  notesLabel: "Notes",
  updatedLabel: "Updated",
  colorTypeSolidLabel: "Solid",
  colorTypeMetallicLabel: "Metallic",
  colorTypePearlLabel: "Pearl",
  colorTypeMatteLabel: "Matte",
  colorTypeCandyLabel: "Candy",
  colorTypeSpecialLabel: "Special",
  copySuccess: "Copied to clipboard",
  copyFail: "Copy failed, please retry",
  favorite: "Favorite",
  favorited: "Favorited",
  favoriteAdded: "Added to favorites",
  favoriteRemoved: "Removed from favorites",
  favoriteFail: "Failed to update favorites",
  removeFavorite: "Remove",
  favoritesTitle: "My Favorites",
  favoritesEmpty: "No favorites yet",
  favoritesEmptyHint: "Tap the heart on any formula to save it here",
  favoritesSearchPlaceholder: "Search color code, name or brand...",
  weight: "Weight",
  accum: "Accum",
  massTone: "Mass Tone",
  colorPreview: "Color Preview",
  hexInputLabel: "Hex Color",
  tabColorInfo: "Color Information",
  tabColorDocs: "Color Documents",
  tabPlasticParts: "Plastic Parts",
  manufacturerLabel: "Manufacturer",
  emptyState: "No data available",
  totalWeightLabel: "Total",
  pearlPaintLabel: "Pearl Paint",
  groundPaintLabel: "Ground Paint",
  originLabel: "Origin",
  processLabel: "Process",
  searchHint: "Enter search criteria on the left",
  noResults: "No matching colors found",
  noResultsHint: "Try a different make or color code",
  foundCount: (n) => `Found ${n} color${n > 1 ? "s" : ""}`,
  truncatedHint: (max) => `Showing first ${max} results. Please refine your search.`,
  totalFormula: (c, f) => `Found ${c} color${c > 1 ? "s" : ""}, ${f} formula${f > 1 ? "s" : ""}`,
  colorsBadge: (n) => `${n} Colors`,
  formulasBadge: (n) => `${n} Formulas`,
  versionLabel: "Version",
  pageSizeLabel: "Rows per page",
  previousPage: "Previous",
  nextPage: "Next",
  pageOf: (current, total) => `Page ${current} of ${total}`,
  foundFormulas: (n) => `Found ${n} formula${n > 1 ? "s" : ""}`,
  carModelLabel: "Car model",
  tdsSearchPlaceholder: "Search documents...",
  tdsCategories: "Product Categories",
  tdsAllCategories: "All Categories",
  tdsListLabel: "Documents",
  tdsSelectHint: "Select a document to view",
  tdsBackToList: "← Back to all documents",
  tdsTableOfContents: "On this page",
  tdsDocTypeAll: "All",
  tdsDocTypeTds: "TDS",
  tdsDocTypeMsds: "MSDS",
  tdsDocTypeSds: "SDS",
  tdsDocTypeManual: "Manual",
  tdsTypeAll: "All",
  tdsLoading: "Loading...",
  tdsNotFound: "Document not found",
  tdsBack: "← Back",
  tdsDragHint: "Drag to move, double-click to reset",
  tdsHideToc: "Hide table of contents",
  adminTitle: "User List",
  adminNewUser: "New User",
  adminNoPermission: "No permission to access",
  adminPasswordRequired: "Password is required for new user",
  adminCannotDeleteAdmin: "Cannot delete super admin",
  adminLoading: "Loading...",
  adminColId: "ID",
  adminColUsername: "Username",
  adminColRole: "Role",
  adminColCreatedAt: "Created At",
  adminColActions: "Actions",
  adminRoleAdmin: "Admin",
  adminRoleUser: "User",
  adminEdit: "Edit",
  adminDelete: "Delete",
  adminEditTitle: "Edit User",
  adminLabelPassword: "Password",
  adminPasswordHint: "Leave blank to keep unchanged",
  adminPasswordPlaceholder: "Leave blank to keep unchanged",
  adminLabelRole: "Role",
  adminCancel: "Cancel",
  adminSave: "Save",
  adminCreate: "Create",
  adminConfirmDelete: (username) => `Are you sure you want to delete user "${username}"?`,
};

// dict 工厂：英文原文为底，语言文件覆盖已翻译的键
// 缺任何键自动回退英文原文（Kapci 核心：永远可读）
export const dict = (d: Partial<I18nDict> = {}): I18nDict => ({
  ...ENGLISH_DEFAULTS,
  ...d,
});

// 双语字段选择：优先中文（lang === "zh" 且存在中文时），否则英文
// 用于数据库中的 _zh 双语字段（业务数据不做全语言扩展，见 Kapci 哲学）
export const pickText = (lang: string, en?: string, zh?: string): string =>
  lang === "zh" && zh ? zh : (en ?? "");
