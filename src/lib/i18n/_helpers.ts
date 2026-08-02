// i18n 内部辅助 — I18nDict 接口、dict 工厂、plural 函数

// 单一文案结构（必须所有语言都提供所有 key）
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
  navAppGuide: string;
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
  login: string;
  close: string;
  brandSlogan: string;
  officialWebsite: string;
  loginMobileTitle: string;
  loginErrorEmpty: string;
  loginErrorNetwork: string;
  loginErrorFailed: string;
  loginRegisterLink: string;
  registerWelcome: string;
  registerSubtitle: string;
  registerTitle: string;
  registerButton: string;
  registerConfirmLabel: string;
  registerConfirmPlaceholder: string;
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
  guideSearchPlaceholder: string;
  guideCategories: string;
  guideAllCategories: string;
  guideListLabel: string;
  guideSelectHint: string;
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

// dict 工厂：合并默认值与语言覆盖
export const dict = (d: Omit<I18nDict,
  "formulasCount" | "foundCount" | "truncatedHint" | "totalFormula" | "colorsBadge" | "formulasBadge"
  | "loginEmail" | "loginPlaceholderEmail"
  | "loginRegisterLink" | "registerWelcome" | "registerSubtitle" | "registerTitle"
  | "registerButton" | "registerConfirmLabel" | "registerConfirmPlaceholder" | "registerSuccess"
  | "registerErrorExists" | "registerErrorFormat" | "registerErrorPassword" | "registerErrorMismatch"
  | "registerLoginLink" | "registerErrorFailed" | "backToLogin" | "haveAccount" | "loginLink"
  | "weight" | "accum" | "massTone" | "colorPreview" | "hexInputLabel"
  | "tabColorInfo" | "tabColorDocs" | "tabPlasticParts"
  | "manufacturerLabel" | "emptyState" | "totalWeightLabel"
  | "pearlPaintLabel" | "groundPaintLabel"
  | "versionLabel" | "pageSizeLabel" | "previousPage" | "nextPage" | "pageOf" | "foundFormulas"
  | "carModelLabel" | "originLabel" | "processLabel"
> & {
  formulasCount?: (n: number) => string;
  foundCount?: (n: number) => string;
  truncatedHint?: (max: number) => string;
  totalFormula?: (c: number, f: number) => string;
  colorsBadge?: (n: number) => string;
  formulasBadge?: (n: number) => string;
  loginEmail?: string;
  loginPlaceholderEmail?: string;
  loginRegisterLink?: string;
  registerWelcome?: string;
  registerSubtitle?: string;
  registerTitle?: string;
  registerButton?: string;
  registerConfirmLabel?: string;
  registerConfirmPlaceholder?: string;
  registerSuccess?: string;
  backToLogin?: string;
  haveAccount?: string;
  loginLink?: string;
  registerErrorExists?: string;
  registerErrorFormat?: string;
  registerErrorPassword?: string;
  registerErrorMismatch?: string;
  registerLoginLink?: string;
  registerErrorFailed?: string;
  weight?: string;
  accum?: string;
  massTone?: string;
  colorPreview?: string;
  hexInputLabel?: string;
  tabColorInfo?: string;
  tabColorDocs?: string;
  tabPlasticParts?: string;
  manufacturerLabel?: string;
  emptyState?: string;
  totalWeightLabel?: string;
  pearlPaintLabel?: string;
  groundPaintLabel?: string;
  versionLabel?: string;
  pageSizeLabel?: string;
  previousPage?: string;
  nextPage?: string;
  pageOf?: (current: number, total: number) => string;
  foundFormulas?: (n: number) => string;
  carModelLabel?: string;
  originLabel?: string;
  processLabel?: string;
}): I18nDict => ({
  formulasCount: d.formulasCount ?? ((n) => plural(n, "formula", "formulas")),
  foundCount: d.foundCount ?? ((n) => `Found ${n} color${n > 1 ? "s" : ""}`),
  truncatedHint: d.truncatedHint ?? ((max) => `Showing first ${max} results. Please refine your search.`),
  totalFormula: d.totalFormula ?? ((c, f) => `Found ${c} color${c > 1 ? "s" : ""}, ${f} formula${f > 1 ? "s" : ""}`),
  colorsBadge: d.colorsBadge ?? ((n) => `${n} Colors`),
  formulasBadge: d.formulasBadge ?? ((n) => `${n} Formulas`),
  loginEmail: d.loginEmail ?? "Username",
  loginPlaceholderEmail: d.loginPlaceholderEmail ?? "Enter your username",
  loginRegisterLink: d.loginRegisterLink ?? "No account? Register",
  registerWelcome: d.registerWelcome ?? "Welcome New Friend",
  registerSubtitle: d.registerSubtitle ?? "Create your account to get started",
  registerTitle: d.registerTitle ?? "Create account",
  registerButton: d.registerButton ?? "Register",
  registerConfirmLabel: d.registerConfirmLabel ?? "Confirm Password",
  registerConfirmPlaceholder: d.registerConfirmPlaceholder ?? "Re-enter password",
  registerSuccess: d.registerSuccess ?? "Registration successful, signing in...",
  registerErrorExists: d.registerErrorExists ?? "Username already exists",
  registerErrorFormat: d.registerErrorFormat ?? "Username must be 3-20 chars: start with a letter, only letters/numbers/_",
  registerErrorPassword: d.registerErrorPassword ?? "Password must be at least 8 characters",
  registerErrorMismatch: d.registerErrorMismatch ?? "Passwords do not match",
  registerLoginLink: d.registerLoginLink ?? "Already have an account? Sign in",
  registerErrorFailed: d.registerErrorFailed ?? "Registration failed",
  backToLogin: d.backToLogin ?? "Back to login",
  haveAccount: d.haveAccount ?? "Already have an account?",
  loginLink: d.loginLink ?? "Log in",
  weight: d.weight ?? "Weight",
  accum: d.accum ?? "Accum",
  massTone: d.massTone ?? "Mass Tone",
  colorPreview: d.colorPreview ?? "Color Preview",
  hexInputLabel: d.hexInputLabel ?? "Hex Color",
  tabColorInfo: d.tabColorInfo ?? "Color Information",
  tabColorDocs: d.tabColorDocs ?? "Color Documents",
  tabPlasticParts: d.tabPlasticParts ?? "Plastic Parts",
  manufacturerLabel: d.manufacturerLabel ?? "Manufacturer",
  emptyState: d.emptyState ?? "No data available",
  totalWeightLabel: d.totalWeightLabel ?? "Total",
  pearlPaintLabel: d.pearlPaintLabel ?? "Pearl Paint",
  groundPaintLabel: d.groundPaintLabel ?? "Ground Paint",
  versionLabel: d.versionLabel ?? "Version",
  pageSizeLabel: d.pageSizeLabel ?? "Rows per page",
  previousPage: d.previousPage ?? "Previous",
  nextPage: d.nextPage ?? "Next",
  pageOf: d.pageOf ?? ((current, total) => `Page ${current} of ${total}`),
  foundFormulas: d.foundFormulas ?? ((n) => `Found ${n} formula${n > 1 ? "s" : ""}`),
  carModelLabel: d.carModelLabel ?? "Car model",
  originLabel: d.originLabel ?? "Origin",
  processLabel: d.processLabel ?? "Process",
  ...d,
});
