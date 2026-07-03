// Client-safe i18n dictionary for the billing screen and the printable bill.
// Product names/categories are user data and are shown as entered.

export type Lang = "en" | "hi";

export const LANG_STORAGE_KEY = "grocery-lang";

export const LANGS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "hi", label: "हिं" },
];

export interface Dict {
  // Billing screen
  billingAs: string;
  logout: string;
  searchPlaceholder: string;
  all: string;
  loadingProducts: string;
  noProducts: string;
  cart: string;
  clear: string;
  emptyCart: string;
  per: string;
  total: string;
  checkout: string;
  saving: string;
  loading: string;
  // Bill screen
  backToCart: string;
  print: string;
  downloadImage: string;
  downloadPdf: string;
  share: string;
  working: string;
  taxInvoice: string;
  billNo: string;
  item: string;
  qty: string;
  rate: string;
  amount: string;
  grandTotal: string;
  thankYou: string;
  startNewSale: string;
  language: string;
  // Messages
  imageError: string;
  pdfError: string;
  shareUnsupported: string;
  shareFailed: string;
}

export const translations: Record<Lang, Dict> = {
  en: {
    billingAs: "Billing as",
    logout: "Log out",
    searchPlaceholder: "Search products…",
    all: "All",
    loadingProducts: "Loading products…",
    noProducts: "No products found.",
    cart: "Cart",
    clear: "Clear",
    emptyCart: "Tap a product to add it to the cart.",
    per: "per",
    total: "Total",
    checkout: "Checkout & Generate Bill",
    saving: "Saving…",
    loading: "Loading…",
    backToCart: "← Back to cart",
    print: "Print",
    downloadImage: "Download image",
    downloadPdf: "Download PDF",
    share: "Share",
    working: "Working…",
    taxInvoice: "Tax Invoice",
    billNo: "Bill No",
    item: "Item",
    qty: "Qty",
    rate: "Rate",
    amount: "Amount",
    grandTotal: "Grand Total",
    thankYou: "Thank you for shopping with us!",
    startNewSale: "Start new sale",
    language: "Language",
    imageError: "Could not generate image.",
    pdfError: "Could not generate PDF.",
    shareUnsupported:
      "Sharing isn't supported on this browser. Use Download image instead.",
    shareFailed: "Sharing was cancelled or failed.",
  },
  hi: {
    billingAs: "बिलिंग",
    logout: "लॉग आउट",
    searchPlaceholder: "उत्पाद खोजें…",
    all: "सभी",
    loadingProducts: "उत्पाद लोड हो रहे हैं…",
    noProducts: "कोई उत्पाद नहीं मिला।",
    cart: "कार्ट",
    clear: "खाली करें",
    emptyCart: "कार्ट में जोड़ने के लिए किसी उत्पाद पर टैप करें।",
    per: "प्रति",
    total: "कुल",
    checkout: "चेकआउट और बिल बनाएं",
    saving: "सहेजा जा रहा है…",
    loading: "लोड हो रहा है…",
    backToCart: "← कार्ट पर वापस",
    print: "प्रिंट करें",
    downloadImage: "इमेज डाउनलोड करें",
    downloadPdf: "PDF डाउनलोड करें",
    share: "साझा करें",
    working: "कृपया प्रतीक्षा करें…",
    taxInvoice: "कर बीजक",
    billNo: "बिल नं.",
    item: "वस्तु",
    qty: "मात्रा",
    rate: "दर",
    amount: "राशि",
    grandTotal: "कुल योग",
    thankYou: "हमारे साथ खरीदारी करने के लिए धन्यवाद!",
    startNewSale: "नई बिक्री शुरू करें",
    language: "भाषा",
    imageError: "इमेज नहीं बन सकी।",
    pdfError: "PDF नहीं बन सका।",
    shareUnsupported:
      "यह ब्राउज़र साझा करने का समर्थन नहीं करता। इसके बजाय इमेज डाउनलोड करें।",
    shareFailed: "साझा करना रद्द या विफल हुआ।",
  },
};
