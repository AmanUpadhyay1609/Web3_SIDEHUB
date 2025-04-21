const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://dabloo:dabloo@cluster0.tckfvmd.mongodb.net/sidehub";

// Define schema and model
const tokenhubSchema = new mongoose.Schema({
  address: { type: String, required: true },
  name: { type: String, required: true },
  symbol: { type: String, required: true },
  price: { type: Number, required: true },
  priceInNative: { type: String },
  decimal: { type: Number, required: true },
  logoURI: { type: String },
  coinGeckoId: { type: String },
  isRecommended: { type: Boolean, required: true },
  total_supply: { type: String },
  total_supply_formatted: { type: String },
  links: { type: Object },
  marketCap: { type: String },
  price_change_percentage: { type: Object },
  volume_usd: { type: Object },
  reserve_in_usd: { type: String },
  security_score: { type: mongoose.Schema.Types.Mixed },
  chain:{type:String,required:true}
});

 const Tokenhub = mongoose.model('tokenhub', tokenhubSchema);

 export async function insertTokenData() {
  try {
    // Establish connection
    await mongoose.connect(MONGODB_URI, {
      serverApi: { version: "1" } // Using ServerApiVersion.v1
    });

    console.log("Connected to MongoDB!");

    const tokenData = {
      address: "0x625bb9bb04bdca51871ed6d07e2dd9034e914631",
      __v: 0,
      decimal: 18,
      links: {
        moralis: "https://moralis.com/chain/base/token/price/0x625bb9bb04bdca51871ed6d07…"
      },
      logoURI: "https://logo.moralis.io/0x2105_0x625bb9bb04bdca51871ed6d07…",
      marketCap: "3705826.81337555",
      name: "H4CK Terminal by Virtuals",
      price: 0.001788823683659341,
      priceInNative: "0.0012550452892445309",
      price_change_percentage: {
        price: 0.001788823683659341,
        m5: {},
        h1: {},
        h6: {},
        h24: {}
      },
      reserve_in_usd: "477224.8361",
      security_score: 79,
      symbol: "H4CK",
      total_supply: "990394624521189968888072417",
      total_supply_formatted: "990394624.521189968888072417",
      isRecommended: false, // ✅ Added this to fix validation error
      chain:'base',
      volume_usd: {
        m5: "0.0",
        h1: "1561.7970754771",
        h6: "36559.0471121255",
        h24: "187316.784302702"
      }
    };

    await Tokenhub.create(tokenData);
    console.log("Data inserted successfully!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
    console.log("MongoDB connection closed.");
  }
}

// Call the function   
insertTokenData();
