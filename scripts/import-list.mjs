/**
 * Import the grocery product list (from "List saman pdf").
 *
 * Non-destructive: existing products are left untouched. Only names that are
 * not already present are inserted. Prices default to 0 and stock to 0 so the
 * owner can fill them in from the Admin screen. Hindi names are left blank and
 * can be filled with the "Translate missing Hindi names" button.
 *
 * Usage:
 *   1. Ensure .env.local has a valid MONGODB_URI
 *   2. node scripts/import-list.mjs
 */
import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: ".env.local" });
config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local");
  process.exit(1);
}

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameHi: { type: String, trim: true, default: "" },
    price: { type: Number, required: true, min: 0, default: 0 },
    priceQuantity: { type: Number, required: true, min: 0.001, default: 1 },
    unit: { type: String, required: true, default: "pcs" },
    category: { type: String, required: true, trim: true, default: "General" },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    imageUrl: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

// category -> { unit, items[] }
const CATALOG = [
  {
    category: "Namak",
    unit: "kg",
    items: ["Tata Namak", "Kala Namak", "Lahori Namak"],
  },
  {
    category: "Mirch",
    unit: "kg",
    items: [
      "Sabut Mirch",
      "Peesi Mirch",
      "Sabut Mirch Pkt",
      "Peesi Mirch Pkt",
      "Peeli Mirch",
      "Kali Mirch",
      "Dakhni Mirch",
    ],
  },
  {
    category: "Haldi",
    unit: "kg",
    items: ["Sabut Haldi", "Peesi Haldi", "Sabut Haldi Pkt", "Peesi Haldi Pkt"],
  },
  {
    category: "Dhaniya",
    unit: "kg",
    items: [
      "Sabut Dhaniya",
      "Peesi Dhaniya",
      "Sabut Dhaniya Pkt",
      "Peesi Dhaniya Pkt",
    ],
  },
  { category: "Jeera", unit: "kg", items: ["Jeera Loose", "Jeera Pkt"] },
  { category: "Ajwain", unit: "kg", items: ["Ajwain Loose", "Ajwain Pkt"] },
  {
    category: "MDH Masala",
    unit: "pcs",
    items: [
      "Degi Mirch",
      "Kashimiri Mirch",
      "Meat Masala",
      "Chicken Masala",
      "Chat Masala",
      "Chana Masala",
      "Kitchen King",
      "Rajma Masala",
      "Raita Masala",
      "Kasuri Methi",
      "Jaljeera",
      "Dal Makhni Masala",
      "Sambhar",
      "Pau Bhaji Masala",
      "Shahi Paneer",
      "Garam Masala",
      "Tea Masala",
    ],
  },
  {
    category: "Minar Masala",
    unit: "pcs",
    items: [
      "Minar Haldi",
      "Minar Mirch",
      "Minar Dhaniya",
      "Minar Chat Masala",
      "Minar Nahari Masala",
      "Minar Peeli Mirch",
    ],
  },
  {
    category: "Chowmin",
    unit: "pcs",
    items: [
      "Chowmin",
      "Kala Sirka",
      "Safed Sirka",
      "Soya Sauce",
      "Green Sauce",
      "Red Chilli",
      "Tomato Sauce",
      "Aam ka achar",
      "Nimbu ka achar",
      "Mix achar",
      "Jam",
      "Adrak Slice",
      "Pyaz",
      "Pineapple Slice",
      "Murabba",
      "Ajino moto",
    ],
  },
  {
    category: "Rang",
    unit: "pcs",
    items: [
      "Champai",
      "Rau chap",
      "Hara Rang",
      "Gulabi Rang",
      "Chocolaty Rang",
      "Basanti Rang",
    ],
  },
  {
    category: "Besan",
    unit: "kg",
    items: [
      "Besan Mota",
      "Besan Bareek",
      "Besan Moti choor",
      "Besan 1 kg",
      "Besan 500 g",
    ],
  },
  {
    category: "Sugar",
    unit: "kg",
    items: [
      "Sugar 1st 50 kg",
      "Sugar Agota",
      "Sugar 1 kg",
      "Sugar 5 kg",
      "Sugar Loose",
      "Sugar 10 Kg",
      "Bura",
      "Karara",
      "Khand",
      "Gud",
      "Shakkar",
    ],
  },
  {
    category: "Aata",
    unit: "kg",
    items: [
      "Aata Bareek",
      "Aata Mota",
      "Aata Makka",
      "Aata Meal",
      "Aata Bajra",
      "Aata 10 kg",
      "Aata 5 kg",
      "Aata Kutu",
      "Aata Singadi",
      "Aata Fine",
    ],
  },
  {
    category: "Dal",
    unit: "kg",
    items: [
      "Urd dal",
      "Urd Dhova Dal",
      "Urd Sabut Dal",
      "Urd Dhas Dal",
      "Urd Kali Dal",
      "Moong Dhova",
      "Moong Chilka",
      "Moong Sabut",
      "Moth Sabut",
      "Dal Chana",
      "Chana Kala",
      "Chana Kabuli Mota",
      "Chana Kabuli Bareek",
      "Chana Kabuli Medium",
      "Arhar Dal Moti",
      "Arhar Dal Maharastra",
      "Arhar Dal Desi",
      "Matra Safed",
      "Matra Dal",
      "Hari Matar",
      "Masoor Dal Bareek",
      "Masoor Dal Moti",
      "Masoor Kali Sabut",
      "Malka Laal",
      "Lobia Laal",
      "Lobia Safed",
      "Soya been Dana",
      "Kangni",
      "Makka",
    ],
  },
  {
    category: "Dry Fruits",
    unit: "kg",
    items: [
      "Badam Giri American",
      "Badam Giri Indi",
      "Badam Giri Gurbandi",
      "Badam Mamura",
      "Badam Sanora",
      "Badam oil",
      "Pista Hara",
      "Pista Namkeen",
      "Kaju Sabut",
      "Kaju Tukda",
      "Kishmiss",
      "Chironji",
      "Kharbooja Meeng",
      "Tarbooja Meeng",
      "Akhrot Giri",
      "Akhrot Sabut",
      "Chuara Kala",
      "Chuara Peela",
      "Nariyal",
      "Gola Sabut",
      "Gola Barooda",
      "Makhana",
      "Safed Til",
      "Gond",
      "Kani",
    ],
  },
  {
    category: "Rice",
    unit: "kg",
    items: [
      "Golden 1121",
      "Golden 1121 1 kg",
      "Golden 1121 5 kg",
      "Golden 1121 10 kg",
      "Golden 1509",
      "Golden Regular",
      "Golden Tiwar",
      "Golden Dubar",
      "Golden Rejection",
      "Black Sukhbir",
      "Green Sukhbir",
      "White Gold",
      "Galaxy Golden 30 kg",
      "Galaxy Golden 10 kg",
      "Galaxy Golden 5 kg",
      "Galaxy Golden 1 kg",
      "Steam 1121",
      "Steam 1401",
      "Steam Doon",
      "Steam Doon 1 kg",
      "Steam Doon 5 kg",
      "Steam Doon 10 kg",
      "Steam Regular",
      "Steam Chapi",
      "Steam Delight",
      "Steam Tiwar",
      "Steam dubar",
      "Steam Mogra",
      "Steam Sharbati",
      "Steam Mansoori",
      "Steam PR",
      "Steam Rejection",
      "Steam Raw",
      "Sama Mota",
      "Sama Bareek",
    ],
  },
  {
    category: "Oil",
    unit: "L",
    items: [
      "Sarso Oil 15 ltr",
      "Sarso Oil 5 ltr",
      "Sarso Oil 2 ltr",
      "Sarso Oil 1 ltr",
      "Sarso Oil 0.500 ltr",
      "Refiend Oil 15 ltr",
      "Refiend Oil 5 ltr",
      "Refiend Oil 2 ltr",
      "Refiend Oil 1 ltr",
      "Refiend Oil 0.500 ltr",
      "Refiend Sanflower",
      "Refiend Moongfali",
      "Gola Oil",
      "Til Oil 1 kg",
      "Til Oil 0.500 kg",
      "Til Oil 0.250 kg",
    ],
  },
  {
    category: "Desi Ghee",
    unit: "kg",
    items: [
      "Desi Ghee 15 kg",
      "Desi Ghee 5 kg",
      "Desi Ghee 1 kg",
      "Desi Ghee 0.500 kg",
    ],
  },
  {
    category: "Vanaspati Ghee",
    unit: "kg",
    items: [
      "Vanaspati Ghee 15 kg",
      "Vanaspati Ghee 5 kg",
      "Vanaspati Ghee 1 kg",
      "Vanaspati Ghee 0.500 kg",
    ],
  },
  {
    category: "Surf",
    unit: "pcs",
    items: [
      "Surf Excel",
      "Surf Arial",
      "Surf Tide",
      "Surf Gadi",
      "Surf Wheel",
      "Surf Fena",
      "Surf Rin",
      "Surf Balaji",
    ],
  },
  {
    category: "Soap",
    unit: "pcs",
    items: [
      "No 1 Soap",
      "Lux Soap",
      "Life boy Soap",
      "Fiama Soap",
      "Vivel Soap",
      "Cinthol Soap",
      "Pears Soap",
      "Dove Soap",
      "Diana Soap",
      "Mysoor Soap",
      "Dettol Soap",
      "Margo Soap",
      "Santoor Soap",
      "Excel Soap",
      "Tide Soap",
      "Rin Soap",
      "Vim Soap",
      "Vim Liquid",
      "Handwash",
      "Lizol",
      "Colin",
      "Harpic",
      "Shampoo",
      "Odonil",
      "Room freshner",
      "Hit",
      "Goodnight",
      "Ezee",
      "Comfert",
      "Fenail",
      "Chavyanprash",
      "Match box",
      "Aala",
      "Revive",
      "Hair Oil",
      "Body Lotion",
      "Paste",
    ],
  },
  {
    category: "Seeds",
    unit: "kg",
    items: [
      "Chia Seeds",
      "Pumpkin Seeds",
      "Sabza Seeds",
      "Sunflower Seeds",
      "Flex Seeds",
    ],
  },
  {
    category: "Other",
    unit: "pcs",
    items: [
      "Heeng",
      "Tejpat",
      "Khatayi peesi",
      "Khatayi sabut",
      "Rai",
      "Sarso Kali",
      "Sarso Peeli",
      "Sauff Sabut",
      "Sauff Peesi",
      "Soth Sabut",
      "Soth Peesi",
      "Long",
      "Jaifal",
      "Javitry",
      "Dalchini",
      "Garam masala Sabut",
      "Garam masala Peesa",
      "Peepal",
      "Badi Elaichi",
      "Choti Elaichi",
      "Elaichi dana",
      "Chatni",
      "Podhina",
      "Chatni Nobahar",
      "Khaskhas",
      "Imli",
      "Nosadar",
      "Hedh",
      "Methi Dana",
      "Kesar",
      "Tea",
      "Reetha",
      "Tatri",
      "Satri",
      "Fitakri",
      "Green Cheri",
      "Red Cheri",
      "Kakronda",
      "Aam Ka Laccha",
      "Coffee",
      "Chocolate",
      "Aamla",
      "Macroni",
      "Pasta",
      "Maggie",
      "Jawa",
      "Poha",
      "Daliya",
      "Klonji",
      "Hydro",
      "Papdi",
      "Soda",
      "Baking Powder",
      "Custurd Powder",
      "Amonia",
      "Ararot",
      "Maida",
      "Suji",
      "Boondi",
      "Rooh Afza",
      "ENO",
      "Kala Til",
      "Papad",
      "Kachri",
      "Soya Badi",
      "Soya Chura",
      "Disposal",
      "Supari",
      "Doop Batti",
      "Agar Batti",
    ],
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const desired = [];
  for (const group of CATALOG) {
    for (const name of group.items) {
      desired.push({
        name: name.trim(),
        nameHi: "",
        price: 0,
        priceQuantity: 1,
        unit: group.unit,
        category: group.category,
        quantity: 0,
        imageUrl: "",
      });
    }
  }
  console.log(`Catalog has ${desired.length} products.`);

  const existing = await Product.find({}, { name: 1 }).lean();
  const existingNames = new Set(
    existing.map((p) => (p.name || "").trim().toLowerCase())
  );

  const toInsert = desired.filter(
    (p) => !existingNames.has(p.name.toLowerCase())
  );
  const skipped = desired.length - toInsert.length;

  if (toInsert.length) {
    const docs = await Product.insertMany(toInsert, { ordered: false });
    console.log(`Inserted ${docs.length} new products.`);
  } else {
    console.log("Nothing new to insert.");
  }
  console.log(`Skipped ${skipped} already-existing products.`);

  const total = await Product.countDocuments({});
  console.log(`Total products in DB now: ${total}.`);

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
